import { cn } from "@workspace/ui/lib/utils";
import { AlertCircle, Star } from "lucide-react";
import { Fragment, useMemo } from "react";
import { BookmarkFavicon } from "../bookmark-favicon";
import { BookmarkCardActions } from "../bookmark-card/bookmark-card-actions";
import {
  UnreadDot,
  getDomain,
  isUnread,
} from "../bookmark-card/bookmark-card-parts";
import type { BookmarkCardData } from "../bookmark-card/bookmark.types";
import { LinkWithQuery } from "../bookmark-card/link-with-query";
import {
  groupByDay,
  rowDateLabel,
  timeLabel,
  toTimestamp,
} from "./day-groups";
import { HighlightedTitle } from "./library-card-context";
import { SelectCheckbox, useLibraryItemInteractions } from "./library-item";
import { useIsSelected, useShowsFocusRing } from "./selection-store";

type RowDensity = "list" | "compact";

function LibraryRow({
  bookmark,
  density,
  showTime,
}: {
  bookmark: BookmarkCardData;
  density: RowDensity;
  /** Under a day header the date is redundant, so show the time. */
  showTime: boolean;
}) {
  const selected = useIsSelected(bookmark.id);
  const focused = useShowsFocusRing(bookmark.id);
  const interactions = useLibraryItemInteractions(bookmark.id);
  const domain = getDomain(bookmark.url);
  const title = bookmark.title || domain;
  const timestamp = toTimestamp(bookmark.createdAt);
  const isList = density === "list";
  const tags = (bookmark.tags ?? []).slice(0, 2);
  const failed = bookmark.status === "ERROR";
  const processing =
    bookmark.status === "PENDING" || bookmark.status === "PROCESSING";

  return (
    <div
      data-bookmark-id={bookmark.id}
      data-focused={focused || undefined}
      data-selected={selected || undefined}
      onClickCapture={interactions.onClickCapture}
      onMouseDown={interactions.onMouseDown}
      onPointerDown={interactions.onPointerDown}
      onFocus={interactions.onFocus}
      className={cn(
        "group/item group/card relative scroll-mt-40 rounded-lg transition-colors duration-100 md:scroll-mt-32",
        "hover:bg-muted/70",
        selected && "bg-primary/8 hover:bg-primary/10",
        focused && "ring-2 ring-primary ring-inset",
      )}
    >
      <LinkWithQuery
        to={`/app/b/${bookmark.id}`}
        data-card-link=""
        aria-label={title}
        className={cn(
          "flex min-w-0 items-center gap-3 rounded-lg px-2 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
          isList ? "h-14" : "h-8 gap-2.5",
        )}
      >
        <span
          className={cn(
            "relative flex shrink-0 items-center justify-center",
            isList
              ? "size-8 rounded-lg bg-card ring-1 ring-foreground/7"
              : "size-5",
          )}
        >
          <span
            className={cn(
              "flex items-center justify-center transition-opacity",
              (selected || interactions.selectionActive) && "opacity-0",
              "group-hover/item:opacity-0",
            )}
          >
            {failed ? (
              <AlertCircle className="size-4 text-destructive" />
            ) : (
              <BookmarkFavicon
                faviconUrl={bookmark.faviconUrl}
                bookmarkType={bookmark.type ?? "PAGE"}
                status={bookmark.status}
              />
            )}
          </span>
        </span>
        <span className="flex min-w-0 flex-1 items-center gap-3">
          <span
            className={cn(
              "flex min-w-0 flex-col",
              isList ? "gap-0.5" : "flex-row items-baseline gap-2",
            )}
          >
            <span
              className={cn(
                "truncate text-foreground",
                isList ? "text-[14px] font-medium" : "text-[13px]",
                processing && "text-muted-foreground",
              )}
            >
              <HighlightedTitle text={title} />
            </span>
            <span className="truncate text-[12px] text-muted-foreground">
              {processing ? `Saving ${domain}…` : domain}
            </span>
          </span>
        </span>
        {isList && tags.length > 0 ? (
          <span className="hidden shrink-0 items-center gap-1 lg:flex">
            {tags.map(({ tag }) => (
              <span
                key={tag.id}
                className="max-w-28 truncate rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground"
              >
                #{tag.name}
              </span>
            ))}
          </span>
        ) : null}
        <span className="flex w-24 shrink-0 items-center justify-end gap-2 text-[12px] text-muted-foreground tabular-nums transition-opacity group-hover/item:opacity-0 group-focus-within/item:opacity-0 group-data-focused/item:opacity-0">
          {bookmark.starred ? (
            <Star className="size-3 fill-primary text-primary" aria-label="Starred" />
          ) : null}
          {isUnread(bookmark) ? <UnreadDot /> : null}
          {timestamp !== null
            ? showTime
              ? timeLabel(timestamp)
              : rowDateLabel(timestamp)
            : null}
        </span>
      </LinkWithQuery>
      <SelectCheckbox
        id={bookmark.id}
        label={title}
        forceVisible={interactions.selectionActive}
        className={cn(
          "absolute top-1/2 -translate-y-1/2",
          isList ? "left-3.5" : "left-2",
        )}
      />
      {bookmark.status === "READY" ? (
        <BookmarkCardActions
          url={bookmark.url}
          bookmarkId={bookmark.id}
          starred={bookmark.starred}
          read={bookmark.read}
          bookmarkType={bookmark.type}
          title={bookmark.title}
          className={cn(
            "top-1/2 right-1.5 -translate-y-1/2 bg-transparent shadow-none ring-0 backdrop-blur-none",
            "group-hover/card:translate-y-[-50%] group-focus-within/card:translate-y-[-50%] group-data-focused/item:translate-y-[-50%]",
            !isList && "[&_button]:size-6",
          )}
        />
      ) : null}
    </div>
  );
}

export function LibraryList({
  bookmarks,
  density,
  groupByDate,
}: {
  bookmarks: BookmarkCardData[];
  density: RowDensity;
  groupByDate: boolean;
}) {
  const groups = useMemo(
    () =>
      groupByDate
        ? groupByDay(bookmarks, (bookmark) => toTimestamp(bookmark.createdAt))
        : [{ key: "all", label: "", items: bookmarks }],
    [bookmarks, groupByDate],
  );

  return (
    <div className="flex w-full flex-col" data-testid={`library-${density}`}>
      {groups.map((group, index) => (
        <Fragment key={group.key}>
          {group.label ? (
            <h2
              className={cn(
                "px-2 pb-1.5 text-[12px] font-medium text-muted-foreground",
                index === 0 ? "pt-1" : density === "list" ? "pt-6" : "pt-4",
              )}
            >
              {group.label}
            </h2>
          ) : null}
          <div className="flex flex-col animate-rise-in">
            {group.items.map((bookmark) => (
              <LibraryRow
                key={bookmark.id}
                bookmark={bookmark}
                density={density}
                showTime={groupByDate}
              />
            ))}
          </div>
        </Fragment>
      ))}
    </div>
  );
}
