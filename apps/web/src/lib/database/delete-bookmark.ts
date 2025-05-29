import { prisma } from "@workspace/database";
import { deleteFileFromS3 } from "../aws-s3/aws-s3-delete-files";

export const deleteBookmark = async (body: { id: string; userId: string }) => {
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
