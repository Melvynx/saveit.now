import { Footer } from "@/features/page/footer";
import { Header } from "@/features/page/header";
import { MaxWidthContainer } from "@/features/page/page";
import { getServerUrl } from "@/lib/server-url";
import { BookmarkType, prisma } from "@workspace/database";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Card } from "@workspace/ui/components/card";
import { Typography } from "@workspace/ui/components/typography";
import { cn } from "@workspace/ui/lib/utils";
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
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

const BOOKMARKS_PER_PAGE = 48;

const TYPE_ICONS: Record<string, React.ElementType> = {
  VIDEO: Play,
  YOUTUBE: Play,
  ARTICLE: FileText,
  PAGE: Globe,
  IMAGE: ImageIcon,
  PDF: FileText,
  PRODUCT: ShoppingBag,
};

type PageProps = {
  searchParams: Promise<{ page?: string; type?: string; tag?: string }>;
};

export async function generateMetadata({
  searchParams,
}: PageProps): Promise<Metadata> {
  const { page, type, tag } = await searchParams;
  const pageNum = Math.max(1, Number(page) || 1);

  const parts = ["Explore Bookmarks"];
  if (type) parts.push(`- ${type}`);
  if (tag) parts.push(`- ${tag}`);
  if (pageNum > 1) parts.push(`- Page ${pageNum}`);

  const title = parts.join(" ");
  const description =
    "Browse thousands of curated bookmarks - articles, videos, tools, and resources saved by the SaveIt.now community.";

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
    },
    alternates: {
      canonical: `/explore${pageNum > 1 ? `?page=${pageNum}` : ""}`,
    },
    robots: { index: true, follow: true },
  };
}

function getDomain(url: string) {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return url;
  }
}

export default async function ExplorePage({ searchParams }: PageProps) {
  const { page, type, tag } = await searchParams;
  const currentPage = Math.max(1, Number(page) || 1);
  const offset = (currentPage - 1) * BOOKMARKS_PER_PAGE;

  const validTypes = Object.values(BookmarkType);
  const validatedType = type && validTypes.includes(type as BookmarkType) ? (type as BookmarkType) : undefined;

  const where = {
    status: "READY" as const,
    title: { not: null },
    ...(validatedType && { type: validatedType }),
    ...(tag && {
      tags: {
        some: { tag: { name: { equals: tag, mode: "insensitive" as const } } },
      },
    }),
  };

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

  const tagIds = popularTags.map((t) => t.tagId);
  const tagNames =
    tagIds.length > 0
      ? await prisma.tag.findMany({
          where: { id: { in: tagIds } },
          select: { id: true, name: true },
        })
      : [];
  const tagNameMap = new Map(tagNames.map((t) => [t.id, t.name]));
  const topTags = popularTags
    .map((t) => tagNameMap.get(t.tagId))
    .filter(Boolean) as string[];
  const uniqueTags = [...new Set(topTags)];

  const totalPages = Math.ceil(totalCount / BOOKMARKS_PER_PAGE);
  const baseUrl = getServerUrl();

  const bookmarkTypes = [
    "VIDEO",
    "ARTICLE",
    "PAGE",
    "YOUTUBE",
    "PDF",
    "PRODUCT",
    "IMAGE",
    "TWEET",
  ];

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

  function buildUrl(params: Record<string, string | undefined>) {
    const sp = new URLSearchParams();
    if (params.page && params.page !== "1") sp.set("page", params.page);
    if (params.type) sp.set("type", params.type);
    if (params.tag) sp.set("tag", params.tag);
    const qs = sp.toString();
    return `/explore${qs ? `?${qs}` : ""}`;
  }

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
            <Link href="/explore">
              <Badge
                variant={!type ? "default" : "outline"}
                className="cursor-pointer"
              >
                All
              </Badge>
            </Link>
            {bookmarkTypes.map((t) => {
              const Icon = TYPE_ICONS[t] || Globe;
              return (
                <Link key={t} href={buildUrl({ type: t, tag })}>
                  <Badge
                    variant={type === t ? "default" : "outline"}
                    className="cursor-pointer gap-1"
                  >
                    <Icon className="size-3" />
                    {t.charAt(0) + t.slice(1).toLowerCase()}
                  </Badge>
                </Link>
              );
            })}
          </div>

          {uniqueTags.length > 0 && (
            <div className="flex flex-wrap items-center justify-center gap-2">
              <span className="text-sm text-muted-foreground">Tags:</span>
              {uniqueTags.slice(0, 15).map((tagName) => (
                <Link
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
                </Link>
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
                <Link key={bookmark.id} href={`/p/${bookmark.id}`}>
                  <Card className="group flex h-full flex-col gap-3 overflow-hidden transition-colors hover:bg-muted/50">
                    {bookmark.ogImageUrl && (
                      <div className="relative aspect-video w-full overflow-hidden">
                        <Image
                          src={bookmark.ogImageUrl}
                          alt={bookmark.title || "Bookmark"}
                          fill
                          className="object-cover transition-transform group-hover:scale-105"
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
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
                          {bookmark.tags.slice(0, 2).map((t) => (
                            <Badge
                              key={t.tag.name}
                              variant="outline"
                              className="text-xs"
                            >
                              {t.tag.name}
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
                </Link>
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
                <Link href="/explore">View all</Link>
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
                  <Link
                    href={buildUrl({
                      page: String(currentPage - 1),
                      type,
                      tag,
                    })}
                    rel="prev"
                  >
                    <ArrowLeft className="mr-1 size-4" />
                    Previous
                  </Link>
                </Button>
              )}

              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 7) {
                    pageNum = i + 1;
                  } else if (currentPage <= 4) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 3) {
                    pageNum = totalPages - 6 + i;
                  } else {
                    pageNum = currentPage - 3 + i;
                  }
                  return (
                    <Button
                      key={pageNum}
                      asChild={pageNum !== currentPage}
                      variant={pageNum === currentPage ? "default" : "ghost"}
                      size="sm"
                      className="h-9 w-9"
                    >
                      {pageNum === currentPage ? (
                        <span>{pageNum}</span>
                      ) : (
                        <Link
                          href={buildUrl({
                            page: String(pageNum),
                            type,
                            tag,
                          })}
                        >
                          {pageNum}
                        </Link>
                      )}
                    </Button>
                  );
                })}
              </div>

              {currentPage < totalPages && (
                <Button asChild variant="outline" size="sm">
                  <Link
                    href={buildUrl({
                      page: String(currentPage + 1),
                      type,
                      tag,
                    })}
                    rel="next"
                  >
                    Next
                    <ArrowRight className="ml-1 size-4" />
                  </Link>
                </Button>
              )}
            </nav>
          )}

          <div className="text-center">
            <Typography variant="muted" className="text-sm">
              Page {currentPage} of {totalPages} - {totalCount.toLocaleString()}{" "}
              bookmarks
            </Typography>
          </div>
        </div>
      </MaxWidthContainer>
      <Footer />
    </div>
  );
}
