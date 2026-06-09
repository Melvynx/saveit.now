import { createFileRoute } from "@tanstack/react-router";

const MAX_FILE_SIZE = 2 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
];

export const Route = createFileRoute("/api/user/avatar")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const [{ requireUser }, { prisma }, { uploadFileToS3 }] =
          await Promise.all([
            import("@/lib/safe-route"),
            import("@workspace/database/client"),
            import("@/lib/aws-s3/aws-s3-upload-files"),
          ]);
        const user = await requireUser(request);
        if (user instanceof Response) return user;

        try {
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

          const avatarUrl = await uploadFileToS3({
            file,
            prefix: `users/${user.id}/avatar`,
            fileName: `${Date.now()}-avatar.${file.name.split(".").pop()}`,
            contentType: file.type,
          });

          if (!avatarUrl) {
            return Response.json(
              { error: "Failed to upload file" },
              { status: 500 },
            );
          }

          await prisma.user.update({
            where: { id: user.id },
            data: { image: avatarUrl },
          });

          return Response.json({
            success: true,
            avatarUrl,
          });
        } catch (error) {
          console.error("Error uploading avatar:", error);
          return Response.json(
            { error: "Internal server error" },
            { status: 500 },
          );
        }
      },
    },
  },
});

