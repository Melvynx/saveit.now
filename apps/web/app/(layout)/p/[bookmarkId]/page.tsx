import {
  BookmarkContentView,
  BookmarkSectionTitle,
} from "@/features/bookmarks/bookmark-content-view";
import { getUser } from "@/lib/auth-session";
import { getPublicBookmark } from "@/lib/database/get-bookmark";
import { getServerUrl } from "@/lib/server-url";
import { prisma } from "@workspace/database";
import { Button } from "@workspace/ui/components/button";
import { Card } from "@workspace/ui/components/card";
import { Typography } from "@workspace/ui/components/typography";
import { Gem } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { cache } from "react";
import { RelatedBookmarks } from "./related-bookmarks";

const getBookmarkCached = cache(async (bookmarkId: string) => {
  return getPublicBookmark(bookmarkId);
});

type PageProps = {
  params: Promise<{ bookmarkId: string }>;
};

function getDomain(url: string) {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return url;
  }
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { bookmarkId } = await params;
  const bookmark = await getBookmarkCached(bookmarkId);

  if (!bookmark) {
    return { title: "Bookmark Not Found" };
  }

  const title = bookmark.title || "Untitled Bookmark";
  const domain = getDomain(bookmark.url);
  const description = (
    bookmark.summary ||
    bookmark.ogDescription ||
    `Saved bookmark from ${domain}`
  ).slice(0, 160);

  return {
    title: `${title} - ${domain}`,
    description,
    openGraph: {
      title,
      description,
      type: "article",
      url: `/p/${bookmarkId}`,
      images: [
        {
          url: `/api/og/bookmark/${bookmarkId}`,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`/api/og/bookmark/${bookmarkId}`],
    },
    alternates: {
      canonical: `/p/${bookmarkId}`,
    },
    robots: {
      index: bookmark.status === "READY" && !!bookmark.title,
      follow: true,
    },
  };
}

async function getRelatedBookmarks(bookmarkId: string, tagIds: string[]) {
  const where = {
    id: { not: bookmarkId },
    status: "READY" as const,
    title: { not: null },
    ...(tagIds.length > 0 && {
      tags: { some: { tagId: { in: tagIds } } },
    }),
  };

  return prisma.bookmark.findMany({
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
}

export default async function PublicBookmarkPage({ params }: PageProps) {
  const { bookmarkId } = await params;
  const bookmark = await getBookmarkCached(bookmarkId);
  const user = await getUser();

  if (!bookmark) {
    return <div>Bookmark not found</div>;
  }

  const tagIds = bookmark.tags.map((t) => t.tag.id);
  const relatedBookmarks = await getRelatedBookmarks(bookmarkId, tagIds);

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
    url: `${baseUrl}/p/${bookmarkId}`,
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
          item: `${baseUrl}/p/${bookmarkId}`,
        },
      ],
    },
  };

  return (
    <article className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

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
            <Link href="/signin">Sign in</Link>
          </Button>
        </Card>
      )}
    </article>
  );
}
