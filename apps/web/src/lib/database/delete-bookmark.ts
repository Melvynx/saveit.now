import { prisma } from "@workspace/database";
import { deleteFileFromS3 } from "../aws-s3/aws-s3-delete-files";
import { SafeRouteError } from "../errors";
import { SearchCache } from "../search/search-cache";

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
    throw new SafeRouteError("Bookmark not found", 404);
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

  // Invalidate search cache for the user
  await SearchCache.invalidateBookmarkUpdate(body.userId);

  return bookmark;
};
