import { Footer } from "@/features/page/footer";
import { Header } from "@/features/page/header";
import { MaxWidthContainer } from "@/features/page/page";
import type { BookmarkType, Prisma } from "@workspace/database";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Card } from "@workspace/ui/components/card";
import { Typography } from "@workspace/ui/components/typography";
import { cn } from "@workspace/ui/lib/utils";
import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import {
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  FileText,
  Globe,
  Image as ImageIcon,
  Play,
  ShoppingBag,
} from "lucide-react";
import type { ElementType } from "react";

const BOOKMARKS_PER_PAGE = 48;

const BOOKMARK_TYPES = [
  "VIDEO",
  "ARTICLE",
  "PAGE",
  "YOUTUBE",
  "PDF",
  "PRODUCT",
  "IMAGE",
  "TWEET",
] as const;

const TYPE_ICONS: Record<string, ElementType> = {
  VIDEO: Play,
  YOUTUBE: Play,
  ARTICLE: FileText,
  PAGE: Globe,
  IMAGE: ImageIcon,
  PDF: FileText,
  PRODUCT: ShoppingBag,
};

type ExploreSearch = {
  page?: string;
  type?: string;
  tag?: string;
};

type ExploreBookmark = {
  id: string;
  title: string | null;
  url: string;
  ogImageUrl: string | null;
  faviconUrl: string | null;
  summary: string | null;
  ogDescription: string | null;
  type: BookmarkType | null;
  createdAt: Date;
  tags: Array<{ tag: { name: string } }>;
};

const getExploreData = createServerFn({ method: "GET" })
  .validator((data: ExploreSearch) => data)
  .handler(async ({ data }) => {
    const [{ BookmarkType: BookmarkTypeValues }, { prisma }, { getServerUrl }] =
      await Promise.all([
        import("@workspace/database"),
        import("@workspace/database/client"),
        import("@/lib/server-url"),
      ]);
    const currentPage = Math.max(1, Number(data.page) || 1);
    const offset = (currentPage - 1) * BOOKMARKS_PER_PAGE;
    const validTypes = Object.values(BookmarkTypeValues);
    const validatedType =
      data.type && validTypes.includes(data.type as BookmarkType)
        ? (data.type as BookmarkType)
        : undefined;

    const where = {
      status: "READY" as const,
      title: { not: null },
      ...(validatedType && { type: validatedType }),
      ...(data.tag && {
        tags: {
          some: {
            tag: { name: { equals: data.tag, mode: "insensitive" as const } },
          },
        },
      }),
    } satisfies Prisma.BookmarkWhereInput;

    const [bookmarks, totalCount, popularTags] = await Promise.all([
      prisma.bookmark.findMany({
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
          createdAt: true,
          tags: {
            select: { tag: { select: { name: true } } },
            take: 3,
          },
        },
        orderBy: { createdAt: "desc" },
        skip: offset,
        take: BOOKMARKS_PER_PAGE,
      }),
      prisma.bookmark.count({ where }),
      prisma.bookmarkTag.groupBy({
        by: ["tagId"],
        _count: { tagId: true },
        orderBy: { _count: { tagId: "desc" } },
        take: 20,
      }),
    ]);

    const tagIds = popularTags.map((tag) => tag.tagId);
    const tagNames =
      tagIds.length > 0
        ? await prisma.tag.findMany({
            where: { id: { in: tagIds } },
            select: { id: true, name: true },
          })
        : [];
    const tagNameMap = new Map(tagNames.map((tag) => [tag.id, tag.name]));
    const topTags = popularTags
      .map((tag) => tagNameMap.get(tag.tagId))
      .filter(Boolean) as string[];
    const baseUrl = getServerUrl();
    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "Explore Bookmarks",
      description:
        "Browse thousands of curated bookmarks saved by the SaveIt.now community.",
      url: `${baseUrl}/explore`,
      isPartOf: {
        "@type": "WebSite",
        name: "SaveIt.now",
        url: baseUrl,
      },
      numberOfItems: totalCount,
    };

    return {
      bookmarks: bookmarks as ExploreBookmark[],
      currentPage,
      totalCount,
      totalPages: Math.ceil(totalCount / BOOKMARKS_PER_PAGE),
      uniqueTags: [...new Set(topTags)],
      jsonLd,
    };
  });

export const Route = createFileRoute("/explore")({
  validateSearch: (search: Record<string, unknown>): ExploreSearch => ({
    page: typeof search.page === "string" ? search.page : undefined,
    type: typeof search.type === "string" ? search.type : undefined,
    tag: typeof search.tag === "string" ? search.tag : undefined,
  }),
  loaderDeps: ({ search }) => search,
  loader: ({ deps }) => getExploreData({ data: deps }),
  component: ExplorePage,
});

function getDomain(url: string) {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return url;
  }
}

function buildUrl(params: Record<string, string | undefined>) {
  const searchParams = new URLSearchParams();
  if (params.page && params.page !== "1") {
    searchParams.set("page", params.page);
  }
  if (params.type) {
    searchParams.set("type", params.type);
  }
  if (params.tag) {
    searchParams.set("tag", params.tag);
  }
  const queryString = searchParams.toString();
  return `/explore${queryString ? `?${queryString}` : ""}`;
}

function ExplorePage() {
  const { bookmarks, currentPage, totalCount, totalPages, uniqueTags, jsonLd } =
    Route.useLoaderData();
  const { type, tag } = Route.useSearch();

  return (
    <div>
      <Header />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <MaxWidthContainer className="py-12">
        <div className="flex flex-col gap-8">
          <div className="space-y-3 text-center">
            <Typography variant="h1">Explore Bookmarks</Typography>
            <Typography variant="muted" className="mx-auto max-w-2xl">
              Browse {totalCount.toLocaleString()} curated bookmarks - articles,
              videos, tools, and resources saved by the community.
            </Typography>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2">
            <a href="/explore">
              <Badge
                variant={!type ? "default" : "outline"}
                className="cursor-pointer"
              >
                All
              </Badge>
            </a>
            {BOOKMARK_TYPES.map((bookmarkType) => {
              const Icon = TYPE_ICONS[bookmarkType] || Globe;
              return (
                <a key={bookmarkType} href={buildUrl({ type: bookmarkType, tag })}>
                  <Badge
                    variant={type === bookmarkType ? "default" : "outline"}
                    className="cursor-pointer gap-1"
                  >
                    <Icon className="size-3" />
                    {bookmarkType.charAt(0) +
                      bookmarkType.slice(1).toLowerCase()}
                  </Badge>
                </a>
              );
            })}
          </div>

          {uniqueTags.length > 0 && (
            <div className="flex flex-wrap items-center justify-center gap-2">
              <span className="text-sm text-muted-foreground">Tags:</span>
              {uniqueTags.slice(0, 15).map((tagName) => (
                <a
                  key={tagName}
                  href={buildUrl({
                    type,
                    tag: tag === tagName ? undefined : tagName,
                  })}
                >
                  <Badge
                    variant={tag === tagName ? "default" : "secondary"}
                    className="cursor-pointer text-xs"
                  >
                    {tagName}
                  </Badge>
                </a>
              ))}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {bookmarks.map((bookmark) => {
              const domain = getDomain(bookmark.url);
              const description =
                bookmark.summary || bookmark.ogDescription || "";
              const Icon = TYPE_ICONS[bookmark.type || "PAGE"] || Globe;

              return (
                <a key={bookmark.id} href={`/p/${bookmark.id}`}>
                  <Card className="group flex h-full flex-col gap-3 overflow-hidden transition-colors hover:bg-muted/50">
                    {bookmark.ogImageUrl && (
                      <div className="relative aspect-video w-full overflow-hidden">
                        <img
                          src={bookmark.ogImageUrl}
                          alt={bookmark.title || "Bookmark"}
                          className="h-full w-full object-cover transition-transform group-hover:scale-105"
                          loading="lazy"
                        />
                      </div>
                    )}
                    <div
                      className={cn(
                        "flex flex-1 flex-col gap-2 px-4 pb-4",
                        !bookmark.ogImageUrl && "pt-4",
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <Typography
                          variant="large"
                          className="line-clamp-2 flex-1"
                        >
                          {bookmark.title || "Untitled"}
                        </Typography>
                        <Icon className="mt-1 size-4 shrink-0 text-muted-foreground" />
                      </div>
                      {description && (
                        <Typography
                          variant="muted"
                          className="line-clamp-2 text-sm"
                        >
                          {description}
                        </Typography>
                      )}
                      <div className="mt-auto flex items-center justify-between pt-2">
                        <div className="flex gap-1">
                          {bookmark.tags.slice(0, 2).map((item) => (
                            <Badge
                              key={item.tag.name}
                              variant="outline"
                              className="text-xs"
                            >
                              {item.tag.name}
                            </Badge>
                          ))}
                        </div>
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <ExternalLink className="size-3" />
                          {domain}
                        </span>
                      </div>
                    </div>
                  </Card>
                </a>
              );
            })}
          </div>

          {bookmarks.length === 0 && (
            <div className="py-12 text-center">
              <Typography variant="h3" className="text-muted-foreground">
                No bookmarks found
              </Typography>
              <Typography variant="muted" className="mt-2">
                Try a different filter or browse all bookmarks.
              </Typography>
              <Button asChild variant="outline" className="mt-4">
                <a href="/explore">View all</a>
              </Button>
            </div>
          )}

          {totalPages > 1 && (
            <nav
              className="flex items-center justify-center gap-2"
              aria-label="Pagination"
            >
              {currentPage > 1 && (
                <Button asChild variant="outline" size="sm">
                  <a
                    href={buildUrl({
                      page: String(currentPage - 1),
                      type,
                      tag,
                    })}
                    rel="prev"
                  >
                    <ArrowLeft className="mr-1 size-4" />
                    Previous
                  </a>
                </Button>
              )}

              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(totalPages, 7) }, (_, index) => {
                  let pageNumber: number;
                  if (totalPages <= 7) {
                    pageNumber = index + 1;
                  } else if (currentPage <= 4) {
                    pageNumber = index + 1;
                  } else if (currentPage >= totalPages - 3) {
                    pageNumber = totalPages - 6 + index;
                  } else {
                    pageNumber = currentPage - 3 + index;
                  }

                  return (
                    <Button
                      key={pageNumber}
                      asChild={pageNumber !== currentPage}
                      variant={pageNumber === currentPage ? "default" : "ghost"}
                      size="sm"
                      className="h-9 w-9"
                    >
                      {pageNumber === currentPage ? (
                        <span>{pageNumber}</span>
                      ) : (
                        <a
                          href={buildUrl({
                            page: String(pageNumber),
                            type,
                            tag,
                          })}
                        >
                          {pageNumber}
                        </a>
                      )}
                    </Button>
                  );
                })}
              </div>

              {currentPage < totalPages && (
                <Button asChild variant="outline" size="sm">
                  <a
                    href={buildUrl({
                      page: String(currentPage + 1),
                      type,
                      tag,
                    })}
                    rel="next"
                  >
                    Next
                    <ArrowRight className="ml-1 size-4" />
                  </a>
                </Button>
              )}
            </nav>
          )}

          <div className="text-center">
            <Typography variant="muted" className="text-sm">
              Page {currentPage} of {totalPages} -{" "}
              {totalCount.toLocaleString()} bookmarks
            </Typography>
          </div>
        </div>
      </MaxWidthContainer>
      <Footer />
    </div>
  );
}
