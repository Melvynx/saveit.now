import {
  BookmarkContentView,
  BookmarkSectionTitle,
} from "@/features/bookmarks/bookmark-content-view";
import { RelatedBookmarks } from "@/features/public-bookmarks/related-bookmarks";
import { Button } from "@workspace/ui/components/button";
import { Card } from "@workspace/ui/components/card";
import { Typography } from "@workspace/ui/components/typography";
import { Gem } from "lucide-react";
import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";

const getPublicBookmarkData = createServerFn({ method: "GET" })
  .validator((data: { bookmarkId: string }) => data)
  .handler(async ({ data }) => {
    const [{ getUser }, { getPublicBookmark }, { getServerUrl }] =
      await Promise.all([
        import("@/lib/auth-session"),
        import("@/lib/database/get-bookmark"),
        import("@/lib/server-url"),
      ]);
    const bookmark = await getPublicBookmark(data.bookmarkId);
    const user = await getUser();

    if (!bookmark) {
      return { bookmark: null, relatedBookmarks: [], user, jsonLd: null };
    }

    const tagIds = bookmark.tags.map((tag) => tag.tag.id);
    const { prisma } = await import("@workspace/database/client");
    const where = {
      id: { not: data.bookmarkId },
      status: "READY" as const,
      title: { not: null },
      ...(tagIds.length > 0 && {
        tags: { some: { tagId: { in: tagIds } } },
      }),
    };
    const relatedBookmarks = await prisma.bookmark.findMany({
      where,
      select: {
        id: true,
        title: true,
        url: true,
        ogImageUrl: true,
        faviconUrl: true,
        summary: true,
        ogDescription: true,
        type: true,
        tags: {
          select: { tag: { select: { name: true } } },
          take: 3,
        },
      },
      take: 6,
      orderBy: { createdAt: "desc" },
    });
    const domain = getDomain(bookmark.url);
    const baseUrl = getServerUrl();
    const title = bookmark.title || "Untitled Bookmark";
    const description =
      bookmark.summary ||
      bookmark.ogDescription ||
      `Saved bookmark from ${domain}`;
    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: title,
      description: description.slice(0, 200),
      url: `${baseUrl}/p/${data.bookmarkId}`,
      dateModified: bookmark.updatedAt.toISOString(),
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
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: baseUrl,
          },
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
            item: `${baseUrl}/p/${data.bookmarkId}`,
          },
        ],
      },
    };

    return { bookmark, relatedBookmarks, user, jsonLd };
  });

function getDomain(url: string) {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return url;
  }
}

export const Route = createFileRoute("/p/$bookmarkId")({
  loader: ({ params }) => getPublicBookmarkData({ data: params }),
  component: PublicBookmarkPage,
});

function PublicBookmarkPage() {
  const { bookmark, relatedBookmarks, user, jsonLd } = Route.useLoaderData();

  if (!bookmark) {
    return <div>Bookmark not found</div>;
  }

  return (
    <article className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-6">
      {jsonLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      ) : null}

      <BookmarkContentView bookmark={bookmark} isPublic={true} />

      {relatedBookmarks.length > 0 && (
        <RelatedBookmarks bookmarks={relatedBookmarks} />
      )}

      {user ? null : (
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
