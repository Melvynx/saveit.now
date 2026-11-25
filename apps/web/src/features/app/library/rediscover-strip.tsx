import { useAuthedQuery } from "@/hooks/use-authed-query";
import { api } from "@convex/_generated/api";
import { Button } from "@workspace/ui/components/button";
import { X } from "lucide-react";
import { useState } from "react";
import { BookmarkFavicon } from "../bookmark-favicon";
import {
  CardMedia,
  getDomain,
} from "../bookmark-card/bookmark-card-parts";
import { LinkWithQuery } from "../bookmark-card/link-with-query";
import { relativeAge } from "./day-groups";

const DISMISS_KEY = "saveit:rediscover-dismissed";

const utcDay = () => new Date().toISOString().slice(0, 10);

function readDismissedDay() {
  try {
    return localStorage.getItem(DISMISS_KEY);
  } catch {
    return null;
  }
}

type RediscoverItem = NonNullable<
  ReturnType<typeof useRediscover>
>[number];

function useRediscover(day: string, enabled: boolean) {
  return useAuthedQuery(
    api.bookmarks.queries.rediscover,
    enabled ? { count: 4, day } : "skip",
  );
}

function RediscoverCard({ bookmark }: { bookmark: RediscoverItem }) {
  const domain = getDomain(bookmark.url);
  const title = bookmark.title || domain;
  const image = bookmark.ogImageUrl || bookmark.preview;

  return (
    <LinkWithQuery
      to={`/app/b/${bookmark.id}`}
      className="group/rediscover flex w-64 shrink-0 snap-start items-center gap-3 rounded-xl p-1.5 pr-3 transition-[background-color,scale] duration-150 ease-(--ease-out-soft) outline-none hover:bg-muted/70 focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98] motion-reduce:active:scale-100 sm:w-auto sm:min-w-0"
    >
      <div className="size-11 shrink-0 overflow-hidden rounded-lg bg-muted ring-1 ring-foreground/6">
        {image ? (
          <CardMedia
            src={image}
            alt=""
            minRatio={1}
            maxRatio={1}
            className="size-11"
            imgClassName="object-center"
            fallback={
              <span className="flex size-11 items-center justify-center">
                <BookmarkFavicon
                  faviconUrl={bookmark.faviconUrl}
                  bookmarkType={bookmark.type ?? "PAGE"}
                />
              </span>
            }
          />
        ) : (
          <span className="flex size-11 items-center justify-center">
            <BookmarkFavicon
              faviconUrl={bookmark.faviconUrl}
              bookmarkType={bookmark.type ?? "PAGE"}
            />
          </span>
        )}
      </div>
      <div className="flex min-w-0 flex-col gap-0.5">
        <p className="truncate text-[13px] leading-snug font-medium text-foreground">
          {title}
        </p>
        <p className="truncate text-[12px] text-muted-foreground">
          {domain} · {relativeAge(bookmark.createdAt)}
        </p>
      </div>
    </LinkWithQuery>
  );
}

/** "From your archive": a few older bookmarks, stable per UTC day, dismissible for the day. */
export function RediscoverStrip() {
  const [day] = useState(utcDay);
  const [dismissedDay, setDismissedDay] = useState(readDismissedDay);
  const dismissed = dismissedDay === day;
  const items = useRediscover(day, !dismissed);

  if (dismissed || !items || items.length === 0) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, day);
    } catch {
      // Storage can be unavailable (private mode); hiding for the session is enough.
    }
    setDismissedDay(day);
  };

  return (
    <section
      aria-labelledby="rediscover-heading"
      className="flex flex-col gap-1.5"
      data-testid="rediscover-strip"
    >
      <div className="flex h-6 items-center gap-2 px-2">
        <h2
          id="rediscover-heading"
          className="text-[12px] font-medium text-muted-foreground"
        >
          From your archive
        </h2>
        <Button
          variant="ghost"
          size="icon-xs"
          className="-mr-1 ml-auto text-muted-foreground"
          aria-label="Hide for today"
          title="Hide for today"
          onClick={dismiss}
        >
          <X />
        </Button>
      </div>
      <div className="-mx-4 flex snap-x scroll-px-4 gap-1 overflow-x-auto px-4 no-scrollbar sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0.5 xl:grid-cols-4">
        {items.slice(0, 4).map((bookmark) => (
          <RediscoverCard key={bookmark.id} bookmark={bookmark} />
        ))}
      </div>
    </section>
  );
}
