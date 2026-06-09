import { uploadFileToS3 } from "@/lib/aws-s3/aws-s3-upload-files";
import { getUserBookmark } from "@/lib/database/get-bookmark";
import { requireUser } from "@/lib/safe-route";
import { prisma } from "@workspace/database/client";
import { createFileRoute } from "@tanstack/react-router";

const MAX_FILE_SIZE = 2 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
];

export const Route = createFileRoute("/api/bookmarks/$bookmarkId/upload-screenshot")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        const user = await requireUser(request);
        if (user instanceof Response) return user;

        const bookmark = await getUserBookmark(params.bookmarkId, user.id);
        if (!bookmark) {
          return Response.json({ error: "Bookmark not found" }, { status: 404 });
        }

        const formData = await request.formData();
        const file = formData.get("file");

        if (!(file instanceof File)) {
          return Response.json({ error: "No file provided" }, { status: 400 });
        }

        if (file.size > MAX_FILE_SIZE) {
          return Response.json(
            { error: "File size must be less than 2MB" },
            { status: 400 },
          );
        }

        if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
          return Response.json(
            { error: "Only image files (JPEG, PNG, WebP, GIF) are allowed" },
            { status: 400 },
          );
        }

        const s3Url = await uploadFileToS3({
          file,
          prefix: `users/${user.id}/bookmarks/${params.bookmarkId}`,
          fileName: `${Date.now()}-${file.name}`,
          contentType: file.type,
        });

        if (!s3Url) {
          return Response.json({ error: "Failed to upload file" }, { status: 500 });
        }

        const updatedBookmark = await prisma.bookmark.update({
          where: {
            id: params.bookmarkId,
            userId: user.id,
          },
          data: {
            preview: s3Url,
          },
        });

        return Response.json({
          success: true,
          previewUrl: s3Url,
          bookmark: updatedBookmark,
        });
      },
    },
  },
});
