import { upfetch } from "@/lib/up-fetch";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";

export const fetchBookmark = async (bookmarkId: string) => {
  const result = await upfetch(`/api/bookmarks/${bookmarkId}`, {
    schema: z.object({
      bookmark: z.object({
        id: z.string(),
        url: z.string().url(),
        title: z.string().optional().nullable(),
        faviconUrl: z.string().optional().nullable(),
        summary: z.string().optional().nullable(),
        preview: z.string().optional().nullable(),
        tags: z.array(
          z.object({
            tag: z.object({
              id: z.string(),
              name: z.string(),
              type: z.string(),
            }),
          })
        ),
      }),
    }),
  });
  return result;
};

export const useBookmark = (bookmarkId?: string | null) => {
  const query = useQuery({
    queryKey: ["bookmark", bookmarkId],
    queryFn: async () => {
      if (!bookmarkId) {
        return null;
      }
      return fetchBookmark(bookmarkId);
    },
    enabled: !!bookmarkId,
  });

  return query;
};

export const usePrefetchBookmark = () => {
  const queryClient = useQueryClient();

  const prefetch = (bookmarkId?: string | null) => {
    if (!bookmarkId) {
      return;
    }
    queryClient.prefetchQuery({
      queryKey: ["bookmark", bookmarkId],
      queryFn: () => fetchBookmark(bookmarkId),
    });
  };

  return prefetch;
};
