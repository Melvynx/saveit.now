"use node";

import { v } from "convex/values";
import { throwValidationError } from "../utils/errors";
import { authAction } from "../functions";
import { authComponent, createAuth } from "../auth/config";
import { internal } from "../_generated/api";

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2 MB
const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
];

const R2_URL = process.env.R2_URL ?? "";
const HELP_EMAIL = process.env.HELP_EMAIL ?? "help@saveit.now";
const RESEND_EMAIL_FROM =
  process.env.RESEND_EMAIL_FROM ??
  "Melvyn from SaveIt.now <help@re.saveit.now>";

async function uploadToR2(
  buffer: Buffer,
  key: string,
  contentType: string,
): Promise<string> {
  const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");

  const client = new S3Client({
    region: "auto",
    endpoint: process.env.AWS_ENDPOINT ?? "",
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? "",
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? "",
    },
  });

  const bucket = process.env.AWS_S3_BUCKET_NAME ?? "";

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    }),
  );

  return `${R2_URL}/${key}`;
}

/**
 * uploadAvatar — authAction ("use node")
 *
 * Validates file size (≤ 2 MB) and MIME type, then uploads to R2 and patches
 * the user's image field via auth.api.updateUser.
 *
 * Upload path: users/{userId}/avatar/{Date.now()}-avatar.{ext}
 * Spec 12 §2.2, Contract §A users/actions.ts
 */
export const uploadAvatar = authAction({
  args: {
    fileData: v.bytes(),
    fileName: v.string(),
    contentType: v.string(),
    fileSize: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = ctx.user.id;

    // Guard: file size
    if (args.fileSize > MAX_FILE_SIZE) {
      throwValidationError("File size must be less than 2MB");
    }

    // Guard: MIME type
    if (!ALLOWED_IMAGE_TYPES.includes(args.contentType)) {
      throwValidationError(
        "Only image files (JPEG, PNG, WebP, GIF) are allowed",
      );
    }

    // Derive extension from content type
    const ext = args.contentType.split("/")[1] ?? "png";
    const key = `users/${userId}/avatar/${Date.now()}-avatar.${ext}`;

    const buffer = Buffer.from(args.fileData);
    const avatarUrl = await uploadToR2(buffer, key, args.contentType);

    // Update user image via Better Auth API
    const { auth, headers } = await authComponent.getAuth(createAuth, ctx);
    await auth.api.updateUser({
      body: { image: avatarUrl },
      headers,
    });

    return { success: true, avatarUrl };
  },
});

/**
 * sendBugReport — authAction ("use node")
 *
 * Validates the bug description (min 10 chars) then sends an HTML email to
 * HELP_EMAIL via the email mutations infrastructure (internal.email.mutations.sendEmail).
 *
 * Spec 12 §2.5, Contract §A users/actions.ts
 */
export const sendBugReport = authAction({
  args: {
    description: v.string(),
    deviceInfo: v.optional(v.string()),
    appVersion: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.description.length < 10) {
      throwValidationError(
        "Bug description must be at least 10 characters",
      );
    }

    const user = ctx.user;
    const timestamp = new Date().toISOString();

    const html = [
      "<html><body style=\"font-family:sans-serif;line-height:1.6\">",
      "  <h2>Bug Report</h2>",
      `  <p><strong>From:</strong> ${user.email}</p>`,
      `  <p><strong>User ID:</strong> ${user.id}</p>`,
      `  <p><strong>Time:</strong> ${timestamp}</p>`,
      "  <hr/>",
      "  <h3>Description</h3>",
      `  <p>${args.description.replace(/\n/g, "<br>")}</p>`,
      args.deviceInfo
        ? `  <h3>Device Info</h3><p>${args.deviceInfo.replace(/\n/g, "<br>")}</p>`
        : "",
      args.appVersion
        ? `  <p><strong>App Version:</strong> ${args.appVersion}</p>`
        : "",
      "</body></html>",
    ]
      .filter(Boolean)
      .join("\n");

    // Send email via internal.email.mutations.sendEmail (uses @convex-dev/resend component)
    await ctx.runMutation(internal.email.mutations.sendEmail, {
      to: HELP_EMAIL,
      subject: `Bug Report from ${user.email}`,
      html,
      from: RESEND_EMAIL_FROM,
      replyTo: user.email,
    });

    return null;
  },
});
