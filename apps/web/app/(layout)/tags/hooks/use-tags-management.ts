import { upfetch } from "@/lib/up-fetch";
import { useInfiniteQuery } from "@tanstack/react-query";
import { z } from "zod";

const TagSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(["USER", "IA"]),
  _count: z.object({
    bookmarks: z.number(),
  }),
});

const TagsPageResponseSchema = z.object({
  tags: z.array(TagSchema),
  nextCursor: z.string().nullable(),
  hasNextPage: z.boolean(),
});

export type TagWithCount = z.infer<typeof TagSchema>;

export function useTagsManagement(searchQuery?: string) {
  return useInfiniteQuery({
    queryKey: ["tags-management", searchQuery],
    queryFn: async ({ pageParam }): Promise<z.infer<typeof TagsPageResponseSchema>> => {
      const searchParams = new URLSearchParams();
      if (searchQuery) {
        searchParams.append("q", searchQuery);
      }
      if (pageParam) {
        searchParams.append("cursor", pageParam);
      }
      searchParams.append("limit", "20");
      
      const url = `/api/tags/management${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
      return await upfetch(url, {
        schema: TagsPageResponseSchema,
      });
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: undefined as string | undefined,
  });
}