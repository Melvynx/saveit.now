import { Badge } from "@workspace/ui/components/badge";
import { Card } from "@workspace/ui/components/card";
import { Typography } from "@workspace/ui/components/typography";
import { ExternalLink } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

type RelatedBookmark = {
  id: string;
  title: string | null;
  url: string;
  ogImageUrl: string | null;
  faviconUrl: string | null;
  summary: string | null;
  ogDescription: string | null;
  type: string | null;
  tags: { tag: { name: string } }[];
};

export function RelatedBookmarks({
  bookmarks,
}: {
  bookmarks: RelatedBookmark[];
}) {
  return (
    <section className="flex flex-col gap-4">
      <Typography variant="h3">Related Bookmarks</Typography>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {bookmarks.map((bookmark) => {
          const domain = (() => {
            try {
              return new URL(bookmark.url).hostname.replace("www.", "");
            } catch {
              return bookmark.url;
            }
          })();

          const description = bookmark.summary || bookmark.ogDescription || "";

          return (
            <Link key={bookmark.id} href={`/p/${bookmark.id}`}>
              <Card className="flex h-full flex-col gap-3 p-4 transition-colors hover:bg-muted/50">
                {bookmark.ogImageUrl && (
                  <div className="relative aspect-video w-full overflow-hidden rounded-md">
                    <Image
                      src={bookmark.ogImageUrl}
                      alt={bookmark.title || "Bookmark"}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    />
                  </div>
                )}
                <div className="flex flex-1 flex-col gap-1">
                  <Typography variant="large" className="line-clamp-2">
                    {bookmark.title || "Untitled"}
                  </Typography>
                  {description && (
                    <Typography
                      variant="muted"
                      className="line-clamp-2 text-sm"
                    >
                      {description}
                    </Typography>
                  )}
                </div>
                <div className="flex items-center justify-between">
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
              </Card>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
