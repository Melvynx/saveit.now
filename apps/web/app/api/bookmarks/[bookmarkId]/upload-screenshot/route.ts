import { uploadFileToS3 } from "@/lib/aws-s3/aws-s3-upload-files";
import { getUserBookmark } from "@/lib/database/get-bookmark";
import { userRoute } from "@/lib/safe-route";
import { prisma } from "@workspace/database";
import { NextResponse } from "next/server";
import { z } from "zod";

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
];

export const POST = userRoute
  .params(z.object({ bookmarkId: z.string() }))
  .body(z.any())
  .handler(async (req, { params, ctx, body }) => {
    try {
      // Check if bookmark exists and belongs to user
      const bookmark = await getUserBookmark(params.bookmarkId, ctx.user.id);
      if (!bookmark) {
        return NextResponse.json(
          { error: "Bookmark not found" },
          { status: 404 },
        );
      }

      const file = body.file;

      if (!file) {
        return NextResponse.json(
          { error: "No file provided" },
          { status: 400 },
        );
      }

      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: "File size must be less than 2MB" },
          { status: 400 },
        );
      }

      // Validate file type
      if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
        return NextResponse.json(
          { error: "Only image files (JPEG, PNG, WebP, GIF) are allowed" },
          { status: 400 },
        );
      }

      // Upload to S3
      const s3Url = await uploadFileToS3({
        file,
        prefix: `users/${ctx.user.id}/bookmarks/${params.bookmarkId}`,
        fileName: `${Date.now()}-${file.name}`,
        contentType: file.type,
      });

      if (!s3Url) {
        return NextResponse.json(
          { error: "Failed to upload file" },
          { status: 500 },
        );
      }

      // Update bookmark preview URL in database
      const updatedBookmark = await prisma.bookmark.update({
        where: {
          id: params.bookmarkId,
          userId: ctx.user.id,
        },
        data: {
          preview: s3Url,
        },
      });

      return NextResponse.json({
        success: true,
        previewUrl: s3Url,
        bookmark: updatedBookmark,
      });
    } catch (error) {
      console.error("Error uploading screenshot:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      );
    }
  });
