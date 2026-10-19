"use client";

import { BookmarkFavicon } from "@/features/app/bookmark-favicon";
import { useAuthedQuery } from "@/hooks/use-authed-query";
import { api } from "@convex/_generated/api";
import type { BookmarkDetailDTO } from "@convex/bookmarks/dto";
import { Link } from "@tanstack/react-router";
import { Button } from "@workspace/ui/components/button";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { cn } from "@workspace/ui/lib/utils";
import { RefreshCcw, Sparkles, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import {
  type BookmarkDetailMode,
  formatDetailDate,
  getAskAiQuestion,
  getDomain,
  getTypeLabel,
  isProcessing,
  supportsReadState,
} from "./bookmark-detail-utils";
import { ShortcutHint } from "./bookmark-detail-toolbar";
import { BookmarkTagsEditor } from "./bookmark-tags-editor";
import type { BookmarkDetailActions } from "./use-bookmark-detail-actions";
import { BookmarkDetailLink } from "./use-detail-navigation";

export function MetaLabel({ children }: { children: ReactNode }) {
  return (
    <h2 className="text-xs font-medium text-muted-foreground">{children}</h2>
  );
}

function MetaSection({
  label,
  children,
  className,
}: {
  label: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("flex flex-col gap-2", className)}>
      <MetaLabel>{label}</MetaLabel>
      {children}
    </section>
  );
}

const STATUS_COPY: Record<BookmarkDetailDTO["status"], string> = {
  PENDING: "Queued",
  PROCESSING: "Processing",
  READY: "Ready",
  ERROR: "Failed",
};

function StatusValue({ bookmark }: { bookmark: BookmarkDetailDTO }) {
  const label =
    bookmark.status === "READY" && supportsReadState(bookmark.type)
      ? bookmark.read
        ? "Read"
        : "Unread"
      : STATUS_COPY[bookmark.status];

  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        aria-hidden="true"
        className={cn(
          "size-1.5 rounded-full",
          bookmark.status === "ERROR"
            ? "bg-destructive"
            : isProcessing(bookmark.status) || label === "Unread"
              ? "bg-primary"
              : "bg-muted-foreground/40",
        )}
      />
      {label}
    </span>
  );
}

function DetailsList({ bookmark }: { bookmark: BookmarkDetailDTO }) {
  const rows: [string, ReactNode][] = [
    ["Type", getTypeLabel(bookmark.type)],
    ["Status", <StatusValue key="status" bookmark={bookmark} />],
    ["Saved", formatDetailDate(bookmark.createdAt)],
  ];
  if (bookmark.updatedAt - bookmark.createdAt > 60_000) {
    rows.push(["Updated", formatDetailDate(bookmark.updatedAt)]);
  }
  if (bookmark.openCount > 0) {
    rows.push([
      "Opened",
      `${bookmark.openCount} ${bookmark.openCount === 1 ? "time" : "times"}`,
    ]);
  }

  return (
    <dl className="grid grid-cols-[72px_1fr] gap-x-3 gap-y-2 text-[13px]">
      {rows.map(([label, value]) => (
        <div key={label} className="contents">
          <dt className="text-muted-foreground">{label}</dt>
          <dd className="min-w-0 truncate text-foreground tabular-nums">
            {value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function RelatedBookmarks({
  bookmark,
  mode,
}: {
  bookmark: BookmarkDetailDTO;
  mode: BookmarkDetailMode;
}) {
  const related = useAuthedQuery(api.bookmarks.queries.related, {
    bookmarkId: bookmark._id,
    limit: 5,
  });

  if (related !== undefined && related.length === 0) return null;

  return (
    <MetaSection
      label={bookmark.tags.length > 0 ? "Related" : "Recently saved"}
    >
      <ul className="-mx-2 flex flex-col">
        {related === undefined
          ? Array.from({ length: 3 }).map((_, index) => (
              <li key={index} className="flex items-center gap-2.5 px-2 py-1.5">
                <Skeleton className="size-4 rounded-sm" />
                <Skeleton className="h-3.5 flex-1" />
              </li>
            ))
          : related.map((item) => (
              <li key={item.id}>
                <BookmarkDetailLink
                  bookmarkId={item.id}
                  mode={mode}
                  className="group/related flex items-start gap-2.5 rounded-lg px-2 py-1.5 outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50"
                >
                  <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center text-muted-foreground">
                    <BookmarkFavicon
                      faviconUrl={item.faviconUrl}
                      bookmarkType={item.type ?? "PAGE"}
                    />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="line-clamp-2 text-[13px] leading-snug text-foreground">
                      {item.title || getDomain(item.url)}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {getDomain(item.url)}
                    </span>
                  </span>
                </BookmarkDetailLink>
              </li>
            ))}
      </ul>
    </MetaSection>
  );
}

export function BookmarkMetaPanel({
  bookmark,
  actions,
  mode,
  className,
}: {
  bookmark: BookmarkDetailDTO;
  actions: BookmarkDetailActions;
  mode: BookmarkDetailMode;
  className?: string;
}) {
  const busy = isProcessing(bookmark.status);

  return (
    <aside className={cn("flex flex-col gap-6", className)}>
      <MetaSection label="Tags">
        <BookmarkTagsEditor bookmark={bookmark} disabled={busy} />
      </MetaSection>

      <MetaSection label="Details">
        <DetailsList bookmark={bookmark} />
      </MetaSection>

      <Button
        asChild
        variant="outline"
        className="h-9 justify-start gap-2 rounded-lg"
      >
        <Link to="/app/agents" search={{ q: getAskAiQuestion(bookmark) } as never}>
          <Sparkles className="text-primary" />
          Ask AI about this
        </Link>
      </Button>

      <RelatedBookmarks bookmark={bookmark} mode={mode} />

      <div className="flex flex-col gap-0.5 border-t border-border pt-4">
        <Button
          variant="ghost"
          size="sm"
          className="justify-start gap-2 text-muted-foreground hover:text-foreground"
          disabled={busy}
          onClick={actions.reprocess}
        >
          <RefreshCcw />
          Reprocess
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="justify-start gap-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          disabled={actions.isDeleting}
          onClick={actions.requestDelete}
        >
          <Trash2 />
          Delete
          <span className="ml-auto">
            <ShortcutHint keys={["mod", "D"]} />
          </span>
        </Button>
      </div>
    </aside>
  );
}
