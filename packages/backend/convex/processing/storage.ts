"use node";

/**
 * processing/storage.ts — Plain async R2 helper functions for "use node" pipeline files.
 *
 * These are NOT Convex functions (no query/mutation/action registrations).
 * They are plain TypeScript async functions imported directly by other "use node"
 * files (e.g. pipeline/screenshot.ts, pipeline/steps.ts).
 *
 * For Convex-registered R2 actions (internalAction wrappers), see files/actions.ts.
 */

import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import mime from "mime-types";

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
 * Upload a Buffer to R2 and return the public CDN URL.
 *
 * @param opts.buffer - The raw bytes to upload.
 * @param opts.key    - Full object key: "users/{userId}/bookmarks/{bookmarkId}/{filename}"
 * @param opts.contentType - MIME type of the content (e.g. "image/png").
 * @returns The public CDN URL for the uploaded object.
 */
export async function uploadBuffer(opts: {
  buffer: Buffer;
  key: string;
  contentType: string;
}): Promise<string> {
  const s3 = getS3Client();
  const bucket = process.env.AWS_S3_BUCKET_NAME!;

  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: opts.key,
      Body: opts.buffer,
      ContentType: opts.contentType,
    }),
  );

  return getCdnUrl(opts.key);
}

/**
 * Fetch a URL and upload its contents to R2. Returns the CDN URL on success,
 * or null on fetch error / non-OK response.
 *
 * CI bypass: returns a placeholder URL when process.env.CI is truthy.
 *
 * @param opts.url  - The source URL to fetch.
 * @param opts.key  - Full object key path in R2 (without extension — extension will be
 *                    appended from the detected MIME type if the key has no dot suffix).
 * @returns CDN URL string, or null on failure.
 */
export async function uploadFromURL(opts: {
  url: string;
  key: string;
}): Promise<string | null> {
  // CI bypass: avoid hitting real R2 in tests
  if (process.env.CI === "true" || process.env.CI === "1") {
    return "https://placehold.co/500x500";
  }

  let response: Response;
  try {
    response = await fetch(opts.url);
  } catch (err) {
    console.error("[storage.uploadFromURL] fetch error", err);
    return null;
  }

  if (!response.ok) {
    console.error(
      "[storage.uploadFromURL] non-OK response",
      response.status,
      opts.url,
    );
    return null;
  }

  const contentType =
    response.headers.get("content-type") || "application/octet-stream";
  const ext = mime.extension(contentType) || "bin";

  // Append extension only when the key doesn't already have one
  const fullKey = opts.key.includes(".") ? opts.key : `${opts.key}.${ext}`;

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
    console.error("[storage.uploadFromURL] S3 send error", err);
    return null;
  }

  return getCdnUrl(fullKey);
}

/**
 * Delete one or more objects from R2. Errors per-key are swallowed (best-effort).
 *
 * @param keys - Array of full object keys to delete.
 */
export async function deleteObjects(keys: string[]): Promise<void> {
  const s3 = getS3Client();
  const bucket = process.env.AWS_S3_BUCKET_NAME!;

  for (const key of keys) {
    try {
      await s3.send(
        new DeleteObjectCommand({
          Bucket: bucket,
          Key: key,
        }),
      );
    } catch (err) {
      console.error("[storage.deleteObjects] failed to delete key", key, err);
      // Swallow per-key errors; best-effort cleanup
    }
  }
}
