"use node";

import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import mime from "mime-types";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import { internalAction } from "../_generated/server";
import { authAction } from "../functions";
import { throwNotFound, throwValidationError } from "../utils/errors";
import { assertSafeHttpUrl } from "../utils/url";

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2097152 bytes

const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

const MAX_REMOTE_REDIRECTS = 5;
const MAX_REMOTE_IMAGE_SIZE = MAX_FILE_SIZE;
const ALLOWED_REMOTE_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
  "image/bmp",
  "image/x-icon",
  "image/vnd.microsoft.icon",
  "image/svg+xml",
  "image/apng",
]);

function isPrivateIpv4Address(address: string): boolean {
  const parts = address.split(".").map((part) => Number(part));
  if (
    parts.length !== 4 ||
    parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)
  ) {
    return true;
  }

  const [a, b] = parts as [number, number, number, number];
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 0) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19 || b === 51)) ||
    (a === 203 && b === 0) ||
    a >= 224
  );
}

function isPrivateIpv6Address(address: string): boolean {
  const normalized = address.toLowerCase().replace(/^\[|\]$/g, "");

  return (
    normalized === "::" ||
    normalized === "::1" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe8") ||
    normalized.startsWith("fe9") ||
    normalized.startsWith("fea") ||
    normalized.startsWith("feb") ||
    normalized.startsWith("2001:db8") ||
    (normalized.startsWith("::ffff:") &&
      isPrivateIpv4Address(normalized.slice("::ffff:".length)))
  );
}

function isPrivateIpAddress(address: string): boolean {
  const family = isIP(address);
  if (family === 4) return isPrivateIpv4Address(address);
  if (family === 6) return isPrivateIpv6Address(address);
  return true;
}

async function assertSafeRemoteImageUrl(url: string): Promise<string> {
  const normalizedUrl = assertSafeHttpUrl(url);
  const parsed = new URL(normalizedUrl);
  const hostname = parsed.hostname.replace(/^\[|\]$/g, "");

  if (isIP(hostname)) {
    if (isPrivateIpAddress(hostname)) {
      throw new Error("This URL resolves to a private address");
    }
    return normalizedUrl;
  }

  const addresses = await lookup(hostname, { all: true, verbatim: true });
  if (addresses.length === 0) {
    throw new Error("This URL host could not be resolved");
  }
  if (addresses.some(({ address }) => isPrivateIpAddress(address))) {
    throw new Error("This URL resolves to a private address");
  }

  return normalizedUrl;
}

function getS3Client(): S3Client {
  return new S3Client({
    region: "auto",
    endpoint: process.env.AWS_ENDPOINT,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });
}

function getCdnUrl(key: string): string {
  const r2Url = process.env.R2_URL;
  return `${r2Url}/${key}`;
}

function normalizeContentType(contentType: string | null | undefined): string | null {
  if (!contentType) return null;
  const normalized = contentType.split(";")[0]?.trim().toLowerCase();
  return normalized || null;
}

function isAllowedRemoteImageContentType(
  contentType: string | null,
): contentType is string {
  return Boolean(contentType && ALLOWED_REMOTE_IMAGE_TYPES.has(contentType));
}

async function readResponseBodyWithLimit(
  response: Response,
  maxBytes: number,
): Promise<Buffer | null> {
  if (!response.body) {
    return null;
  }

  const reader = response.body.getReader();
  const chunks: Buffer[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;

      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        void reader.cancel();
        return null;
      }

      chunks.push(Buffer.from(value));
    }
  } finally {
    reader.releaseLock();
  }

  return Buffer.concat(chunks);
}

async function fetchSafeRemoteImage(url: string): Promise<Response | null> {
  let currentUrl: string;

  try {
    currentUrl = await assertSafeRemoteImageUrl(url);
  } catch (err) {
    console.error("[uploadFileFromURL] unsafe url", url, err);
    return null;
  }

  const visited = new Set<string>();

  for (let redirectCount = 0; redirectCount <= MAX_REMOTE_REDIRECTS; redirectCount++) {
    if (visited.has(currentUrl)) {
      console.error("[uploadFileFromURL] redirect loop", currentUrl);
      return null;
    }
    visited.add(currentUrl);

    let response: Response;
    try {
      response = await fetch(currentUrl, { redirect: "manual" });
    } catch (err) {
      console.error("[uploadFileFromURL] fetch error", err);
      return null;
    }

    if (
      response.status === 301 ||
      response.status === 302 ||
      response.status === 303 ||
      response.status === 307 ||
      response.status === 308
    ) {
      const location = response.headers.get("location");
      if (!location) {
        console.error("[uploadFileFromURL] redirect missing location", currentUrl);
        return null;
      }

      try {
        currentUrl = await assertSafeRemoteImageUrl(
          new URL(location, currentUrl).toString(),
        );
      } catch (err) {
        console.error("[uploadFileFromURL] unsafe redirect target", location, err);
        return null;
      }

      continue;
    }

    return response;
  }

  console.error("[uploadFileFromURL] too many redirects", url);
  return null;
}

/**
 * Internal action: upload a Buffer to R2.
 * Called from pipeline steps (screenshot, OG image, favicon, etc.)
 */
export const uploadBuffer = internalAction({
  args: {
    buffer: v.bytes(),
    key: v.string(),
    contentType: v.string(),
  },
  returns: v.string(),
  handler: async (_ctx, args) => {
    const s3 = getS3Client();
    const bucket = process.env.AWS_S3_BUCKET_NAME!;
    const body = Buffer.from(new Uint8Array(args.buffer));

    try {
      await s3.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: args.key,
          Body: body,
          ContentType: args.contentType,
        }),
      );
    } catch (err) {
      console.error("[uploadBuffer] S3 send error", err);
      throw err;
    }

    return getCdnUrl(args.key);
  },
});

/**
 * Internal action: upload a file from a URL to R2.
 * Called from pipeline when fetching OG images, favicons, thumbnails.
 */
export const uploadFileFromURL = internalAction({
  args: {
    url: v.string(),
    key: v.string(),
    contentType: v.optional(v.string()),
  },
  returns: v.union(v.string(), v.null()),
  handler: async (_ctx, args) => {
    // CI bypass: return placeholder to avoid hitting real R2 in tests
    if (process.env.CI === "true" || process.env.CI === "1") {
      return "https://placehold.co/500x500";
    }

    const response = await fetchSafeRemoteImage(args.url);
    if (!response || !response.ok) {
      if (response) {
        console.error(
          "[uploadFileFromURL] non-OK response",
          response.status,
          args.url,
        );
      }
      return null;
    }

    const contentType = normalizeContentType(
      response.headers.get("content-type") ?? args.contentType ?? null,
    );
    if (!isAllowedRemoteImageContentType(contentType)) {
      console.error("[uploadFileFromURL] unsupported content type", contentType, args.url);
      return null;
    }

    const contentLength = response.headers.get("content-length");
    if (contentLength) {
      const parsedLength = Number.parseInt(contentLength, 10);
      if (Number.isFinite(parsedLength) && parsedLength > MAX_REMOTE_IMAGE_SIZE) {
        console.error("[uploadFileFromURL] response too large", parsedLength, args.url);
        return null;
      }
    }

    const body = await readResponseBodyWithLimit(response, MAX_REMOTE_IMAGE_SIZE);
    if (!body || body.length === 0) {
      console.error("[uploadFileFromURL] empty response body", args.url);
      return null;
    }

    const ext = mime.extension(contentType) || "bin";
    const fullKey = args.key.includes(".")
      ? args.key
      : `${args.key}.${ext}`;

    const s3 = getS3Client();
    const bucket = process.env.AWS_S3_BUCKET_NAME!;

    try {
      await s3.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: fullKey,
          Body: body,
          ContentType: contentType,
        }),
      );
    } catch (err) {
      console.error("[uploadFileFromURL] S3 send error", err);
      return null;
    }

    return getCdnUrl(fullKey);
  },
});

/**
 * Internal action: delete one or more objects from R2.
 * Called from bookmarks.mutations.remove.
 */
export const deleteObjects = internalAction({
  args: {
    keys: v.array(v.string()),
  },
  returns: v.null(),
  handler: async (_ctx, args) => {
    const s3 = getS3Client();
    const bucket = process.env.AWS_S3_BUCKET_NAME!;

    for (const key of args.keys) {
      try {
        await s3.send(
          new DeleteObjectCommand({
            Bucket: bucket,
            Key: key,
          }),
        );
      } catch (err) {
        console.error("[deleteObjects] failed to delete key", key, err);
        // Swallow per-key errors; best-effort cleanup
      }
    }

    return null;
  },
});

/**
 * Auth action: user-facing screenshot upload (replaces the TanStack route).
 * Validates ownership, size, MIME; uploads to R2; patches bookmark.preview.
 */
export const uploadBookmarkScreenshot = authAction({
  args: {
    bookmarkId: v.id("bookmarks"),
    fileData: v.bytes(),
    fileName: v.string(),
    contentType: v.string(),
    fileSize: v.number(),
  },
  returns: v.object({
    success: v.boolean(),
    previewUrl: v.string(),
  }),
  handler: async (ctx, args) => {
    const userId = ctx.user.id;

    // 1. Ownership check: bookmark must exist AND belong to the calling user
    const bookmark = await ctx.runQuery(internal.bookmarks.queries.getById, {
      id: args.bookmarkId,
      userId,
    });

    if (!bookmark) {
      throwNotFound("Bookmark not found or does not belong to you");
    }

    // 2. File size check: max 2MB
    if (args.fileSize > MAX_FILE_SIZE) {
      throwValidationError("File size must be less than 2MB");
    }

    // 3. MIME type allowlist check
    if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(args.contentType)) {
      throwValidationError(
        "Only image files (JPEG, PNG, WebP, GIF) are allowed",
      );
    }

    // 4. Build key: users/{userId}/bookmarks/{bookmarkId}/{timestamp}-{fileName}
    const key = `users/${userId}/bookmarks/${args.bookmarkId}/${Date.now()}-${args.fileName}`;

    // 5. Upload to R2
    const s3 = getS3Client();
    const bucket = process.env.AWS_S3_BUCKET_NAME!;
    const body = Buffer.from(new Uint8Array(args.fileData));

    let cdnUrl: string;
    try {
      await s3.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: body,
          ContentType: args.contentType,
        }),
      );
      cdnUrl = getCdnUrl(key);
    } catch (err) {
      console.error("[uploadBookmarkScreenshot] S3 send error", err);
      throw err;
    }

    // 6. Update bookmark preview via internal mutation
    await ctx.runMutation(internal.bookmarks.mutations.updatePreview, {
      id: args.bookmarkId,
      userId,
      preview: cdnUrl,
    });

    return { success: true, previewUrl: cdnUrl };
  },
});
