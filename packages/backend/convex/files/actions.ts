"use node";

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
import { throwForbidden, throwNotFound, throwValidationError } from "../utils/errors";

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2097152 bytes

const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

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

    let response: Response;
    try {
      response = await fetch(args.url);
    } catch (err) {
      console.error("[uploadFileFromURL] fetch error", err);
      return null;
    }

    if (!response.ok) {
      console.error(
        "[uploadFileFromURL] non-OK response",
        response.status,
        args.url,
      );
      return null;
    }

    const contentType =
      args.contentType ||
      response.headers.get("content-type") ||
      "application/octet-stream";

    const ext = mime.extension(contentType) || "bin";
    const fullKey = args.key.includes(".")
      ? args.key
      : `${args.key}.${ext}`;

    const arrayBuffer = await response.arrayBuffer();
    const body = Buffer.from(new Uint8Array(arrayBuffer));

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
