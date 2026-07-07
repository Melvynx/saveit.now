import { api } from "@convex/_generated/api";
import { usePaginatedQuery } from "convex/react";

export type TagWithCount = {
  _id: string;
  id: string;
  name: string;
  type: "USER" | "IA";
  _count: { bookmarks: number };
};

export function useTagsManagement(searchQuery?: string) {
  const { results, status, loadMore, isLoading } = usePaginatedQuery(
    api.tags.queries.listManagement,
    { query: searchQuery || undefined },
    { initialNumItems: 20 },
  );

  const pages: Array<{ tags: TagWithCount[]; nextCursor: string | null; hasNextPage: boolean }> = [
    {
      tags: (results as TagWithCount[]) ?? [],
      nextCursor: null,
      hasNextPage: status === "CanLoadMore",
    },
  ];

  return {
    data: { pages },
    fetchNextPage: () => loadMore(20),
    hasNextPage: status === "CanLoadMore",
    isFetchingNextPage: status === "LoadingMore",
    isLoading: isLoading,
    error: null as Error | null,
  };
}
