export const buildRelatedBookmarksWhere = ({
  bookmarkId,
  userId,
  tagIds,
}: {
  bookmarkId: string;
  userId: string;
  tagIds: string[];
}) => ({
  userId,
  id: { not: bookmarkId },
  status: "READY" as const,
  title: { not: null },
  ...(tagIds.length > 0 && {
    tags: { some: { tagId: { in: tagIds } } },
  }),
});
