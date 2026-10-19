import { useAuthedQuery } from "@/hooks/use-authed-query";
import { api } from "@convex/_generated/api";
import { Button } from "@workspace/ui/components/button";
import { History, X } from "lucide-react";
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
      className="group/rediscover flex w-64 shrink-0 snap-start items-center gap-3 rounded-xl bg-card p-2 pr-3 ring-1 ring-foreground/7 transition-[box-shadow,translate] duration-200 ease-(--ease-out-soft) outline-none hover:-translate-y-0.5 hover:ring-foreground/12 focus-visible:ring-2 focus-visible:ring-ring sm:w-auto sm:min-w-0 sm:flex-1"
    >
      <div className="size-14 shrink-0 overflow-hidden rounded-lg bg-muted">
        {image ? (
          <CardMedia
            src={image}
            alt=""
            minRatio={1}
            maxRatio={1}
            className="size-14"
            imgClassName="object-center"
            fallback={
              <span className="flex size-14 items-center justify-center">
                <BookmarkFavicon
                  faviconUrl={bookmark.faviconUrl}
                  bookmarkType={bookmark.type ?? "PAGE"}
                />
              </span>
            }
          />
        ) : (
          <span className="flex size-14 items-center justify-center">
            <BookmarkFavicon
              faviconUrl={bookmark.faviconUrl}
              bookmarkType={bookmark.type ?? "PAGE"}
            />
          </span>
        )}
      </div>
      <div className="flex min-w-0 flex-col gap-0.5">
        <p className="line-clamp-2 font-serif text-[15px] leading-tight font-medium text-foreground">
          {title}
        </p>
        <p className="truncate text-[12px] text-muted-foreground">
          {domain} · saved {relativeAge(bookmark.createdAt)}
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
      className="flex flex-col gap-2.5 animate-rise-in"
      data-testid="rediscover-strip"
    >
      <div className="flex items-center gap-2">
        <History className="size-3.5 text-primary" aria-hidden />
        <h2
          id="rediscover-heading"
          className="text-[13px] font-medium text-foreground"
        >
          From your archive
        </h2>
        <span className="hidden text-[12px] text-muted-foreground sm:inline">
          Rediscover what you saved a while ago
        </span>
        <Button
          variant="ghost"
          size="icon-xs"
          className="ml-auto text-muted-foreground"
          aria-label="Hide for today"
          title="Hide for today"
          onClick={dismiss}
        >
          <X />
        </Button>
      </div>
      <div className="-mx-4 flex snap-x scroll-px-4 gap-3 overflow-x-auto px-4 pb-1 no-scrollbar sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 sm:pb-0 xl:grid-cols-4">
        {items.slice(0, 4).map((bookmark) => (
          <RediscoverCard key={bookmark.id} bookmark={bookmark} />
        ))}
      </div>
    </section>
  );
}
