import { upfetch } from "@/lib/up-fetch";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BookmarkType } from "@workspace/database";
import { z } from "zod";

const BookmarkSchema = z.object({
  id: z.string(),
  url: z.string().url(),
  title: z.string().optional().nullable(),
  faviconUrl: z.string().optional().nullable(),
  summary: z.string().optional().nullable(),
  preview: z.string().optional().nullable(),
  ogImageUrl: z.string().optional().nullable(),
  note: z.string().optional().nullable(),
  type: z.nativeEnum(BookmarkType),
  metadata: z.any().optional().nullable(),
  starred: z.boolean().optional(),
  read: z.boolean().optional(),
  tags: z.array(
    z.object({
      tag: z.object({
        id: z.string(),
        name: z.string(),
        type: z.string(),
      }),
    }),
  ),
});

export type Bookmark = z.infer<typeof BookmarkSchema>;

export const fetchBookmark = async (bookmarkId: string) => {
  const result = await upfetch(`/api/bookmarks/${bookmarkId}`, {
    schema: z.object({
      bookmark: BookmarkSchema,
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

export const useRefreshBookmark = (bookmarkId?: string | null) => {
  const queryClient = useQueryClient();

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["bookmark", bookmarkId] });
  };

  return refresh;
};

export const useBookmarkMetadata = (bookmarkId?: string | null) => {
  const query = useQuery({
    queryKey: ["bookmark", bookmarkId, "page-metadata"],
    queryFn: async () => {
      if (!bookmarkId) {
        return null;
      }
      return upfetch(`/api/bookmarks/${bookmarkId}/metadata`, {
        schema: z.object({
          title: z.string(),
          faviconUrl: z.string(),
        }),
      });
    },
    enabled: !!bookmarkId,
  });

  return query;
};

export const useBookmarkToken = (bookmarkId?: string | null) => {
  const query = useQuery({
    queryKey: ["bookmark", bookmarkId, "token"],
    queryFn: async () => {
      if (!bookmarkId) {
        return null;
      }
      return upfetch(`/api/bookmarks/${bookmarkId}/subscribe`, {
        schema: z.object({
          token: z.any(),
        }),
      });
    },
    enabled: !!bookmarkId,
  });

  return query;
};
