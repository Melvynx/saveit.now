import { createFileRoute } from "@tanstack/react-router";
import { VariationsClient } from "@/features/variations/variations-client";
import { api } from "@convex/_generated/api";
import { useQuery } from "convex/react";
import type { VariationBookmark } from "@/features/variations/types";
import type { BookmarkDetailDTO } from "@convex/bookmarks/dto";

export const Route = createFileRoute("/variations")({
  component: VariationsPage,
});

function VariationsPage() {
  const bookmarksData = useQuery(
    api.bookmarks.queries.list,
    {
      paginationOpts: { numItems: 50, cursor: null },
      filter: { types: ["PAGE"] },
    },
  );

  const bookmarks: VariationBookmark[] = (
    (bookmarksData?.page ?? []) as BookmarkDetailDTO[]
  ).map((b) => ({
    id: b.id,
    url: b.url,
    title: b.title,
    summary: b.summary,
    ogImageUrl: b.ogImageUrl,
    preview: b.preview,
    faviconUrl: b.faviconUrl,
    ogDescription: b.ogDescription,
    starred: b.starred,
    read: b.read,
    createdAt: new Date(b.createdAt),
    tags: b.tags.map((t) => ({
      tag: { id: t.tag.id, name: t.tag.name, type: t.tag.type },
    })),
    note: b.note,
    imageDescription: null,
  }));

  return <VariationsClient bookmarks={bookmarks} />;
}
