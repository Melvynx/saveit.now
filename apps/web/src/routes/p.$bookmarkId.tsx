import {
  BookmarkContentView,
  BookmarkSectionTitle,
} from "@/features/bookmarks/bookmark-content-view";
import { RelatedBookmarks } from "@/features/public-bookmarks/related-bookmarks";
import { useSession } from "@/lib/auth-client";
import { getServerUrl } from "@/lib/server-url";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Button } from "@workspace/ui/components/button";
import { Card } from "@workspace/ui/components/card";
import { Typography } from "@workspace/ui/components/typography";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { Gem } from "lucide-react";
import { useMemo } from "react";

function getDomain(url: string) {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return url;
  }
}

export const Route = createFileRoute("/p/$bookmarkId")({
  component: PublicBookmarkPage,
});

function PublicBookmarkPage() {
  const { bookmarkId } = Route.useParams();
  const session = useSession();
  const bookmark = useQuery(api.bookmarks.queries.getPublic, {
    id: bookmarkId as Id<"bookmarks">,
  });
  const tagIds =
    bookmark?.tags?.map((t: { tag: { id: string } }) => t.tag.id) ?? [];
  const relatedBookmarks = useQuery(
    api.bookmarks.queries.getRelated,
    bookmark
      ? { id: bookmarkId as Id<"bookmarks">, tagIds, take: 6 }
      : "skip",
  );

  const jsonLd = useMemo(() => {
    if (!bookmark) return null;

    const domain = getDomain(bookmark.url);
    const baseUrl = getServerUrl();
    const title = bookmark.title || "Untitled Bookmark";
    const description =
      bookmark.summary ||
      bookmark.ogDescription ||
      `Saved bookmark from ${domain}`;

    return {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: title,
      description: description.slice(0, 200),
      url: `${baseUrl}/p/${bookmarkId}`,
      isPartOf: {
        "@type": "WebSite",
        name: "SaveIt.now",
        url: baseUrl,
      },
      about: {
        "@type": "CreativeWork",
        name: title,
        url: bookmark.url,
        description: description.slice(0, 200),
      },
      breadcrumb: {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: baseUrl },
          {
            "@type": "ListItem",
            position: 2,
            name: "Explore",
            item: `${baseUrl}/explore`,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: title,
            item: `${baseUrl}/p/${bookmarkId}`,
          },
        ],
      },
    };
  }, [bookmark, bookmarkId]);

  if (bookmark === undefined) return null;
  if (!bookmark) {
    return <div>Bookmark not found</div>;
  }

  const relatedBookmarkList = relatedBookmarks ?? [];

  return (
    <article className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-6">
      {jsonLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      ) : null}

      <BookmarkContentView bookmark={bookmark} isPublic={true} />

      {relatedBookmarkList.length > 0 && (
        <RelatedBookmarks bookmarks={relatedBookmarkList} />
      )}

      {session.data?.user ? null : (
        <Card className="flex flex-col gap-2 p-4">
          <BookmarkSectionTitle icon={Gem} text="Get the full experience" />
          <Typography variant="muted">
            Join SaveIt.now to save, organize, and rediscover your bookmarks
            with AI.
          </Typography>
          <Button asChild className="w-fit">
            <a href="/signin">Sign in</a>
          </Button>
        </Card>
      )}
    </article>
  );
}
