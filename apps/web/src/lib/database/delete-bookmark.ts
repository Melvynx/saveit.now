import { prisma } from "@workspace/database";
import { deleteFileFromS3 } from "../aws-s3/aws-s3-delete-files";
import { ApplicationError } from "../errors";

export const deleteBookmark = async (body: { id: string; userId: string }) => {
  // First, verify the bookmark exists and belongs to the user
  const existingBookmark = await prisma.bookmark.findUnique({
    where: {
      id: body.id,
      userId: body.userId,
    },
    select: {
      id: true,
    },
  });

  if (!existingBookmark) {
    throw new ApplicationError("Bookmark not found");
  }

  const bookmark = await prisma.bookmark.delete({
    where: {
      id: body.id,
      userId: body.userId,
    },
  });

  await deleteFileFromS3({
    key: `users/${body.userId}/bookmarks/${body.id}`,
  });

  return bookmark;
};
