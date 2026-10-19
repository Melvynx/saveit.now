"use client";

import { dialogManager } from "@/features/dialog-manager/dialog-manager-store";
import { ANALYTICS_EVENTS, trackAnalyticsEvent } from "@/lib/analytics";
import { Button } from "@workspace/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { InlineTooltip } from "@workspace/ui/components/tooltip";
import { Kbd } from "@workspace/ui/components/kbd";
import { cn } from "@workspace/ui/lib/utils";
import {
  BookOpen,
  BookOpenCheck,
  Check,
  Copy,
  ExternalLink,
  MoreHorizontal,
  Star,
  Tags,
  Trash,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { useDeleteBookmark } from "../bookmark-page/delete-button";
import { useBookmarkActions } from "../library/use-bookmark-actions";
import { BookmarkTagDialog } from "./bookmark-tag-dialog";

interface BookmarkCardActionsProps {
  bookmarkId: string;
  url: string;
  starred: boolean;
  read?: boolean;
  bookmarkType?: string | null;
  title?: string | null;
  className?: string;
  children?: ReactNode;
}

const canMarkRead = (type?: string | null) =>
  type === "ARTICLE" || type === "YOUTUBE";

const stop = (event: React.SyntheticEvent) => {
  event.preventDefault();
  event.stopPropagation();
};

function ActionTooltip({
  label,
  shortcut,
  children,
}: {
  label: string;
  shortcut?: string;
  children: React.ReactElement;
}) {
  return (
    <InlineTooltip
      title={
        <span className="flex items-center gap-1.5">
          {label}
          {shortcut ? <Kbd>{shortcut}</Kbd> : null}
        </span>
      }
    >
      {children}
    </InlineTooltip>
  );
}

/**
 * Hover / focus action cluster pinned top-right of a card: star, open original,
 * copy link, more. Visible on hover, focus-within, keyboard focus and touch.
 */
export const BookmarkCardActions = ({
  bookmarkId,
  url,
  starred,
  read = false,
  bookmarkType,
  title,
  className = "",
  children,
}: BookmarkCardActionsProps) => {
  const actions = useBookmarkActions();
  const deleteBookmark = useDeleteBookmark();
  const [tagDialogOpen, setTagDialogOpen] = useState(false);

  const buttonClass =
    "size-7 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground";

  return (
    <>
      <div
        data-slot="bookmark-card-actions"
        onClick={(event) => event.stopPropagation()}
        className={cn(
          "absolute top-2 right-2 z-20 flex items-center gap-0.5 rounded-lg bg-background/90 p-0.5 shadow-sm ring-1 ring-foreground/8 backdrop-blur-md",
          "pointer-events-none translate-y-0.5 opacity-0 transition-[opacity,translate] duration-150 ease-(--ease-out-soft)",
          "group-hover/card:pointer-events-auto group-hover/card:translate-y-0 group-hover/card:opacity-100",
          "group-focus-within/card:pointer-events-auto group-focus-within/card:translate-y-0 group-focus-within/card:opacity-100",
          "group-data-focused/item:pointer-events-auto group-data-focused/item:translate-y-0 group-data-focused/item:opacity-100",
          "[@media(pointer:coarse)]:pointer-events-auto [@media(pointer:coarse)]:translate-y-0 [@media(pointer:coarse)]:opacity-100",
          className,
        )}
      >
        <ActionTooltip label={starred ? "Unstar" : "Star"} shortcut="S">
          <Button
            variant="ghost"
            size="icon-sm"
            className={buttonClass}
            aria-label={starred ? "Unstar" : "Star"}
            aria-pressed={starred}
            data-testid="star-button"
            onClick={(event) => {
              stop(event);
              void actions.setStarred(bookmarkId, !starred);
            }}
          >
            <Star
              className={cn(
                "size-3.5",
                starred && "fill-primary text-primary",
              )}
            />
          </Button>
        </ActionTooltip>
        <ActionTooltip label="Open original" shortcut="O">
          <Button
            variant="ghost"
            size="icon-sm"
            className={buttonClass}
            aria-label="Open original"
            onClick={(event) => {
              stop(event);
              actions.openOriginal(url);
            }}
          >
            <ExternalLink className="size-3.5" />
          </Button>
        </ActionTooltip>
        <ActionTooltip
          label={actions.isCopied ? "Copied" : "Copy link"}
          shortcut="C"
        >
          <Button
            variant="ghost"
            size="icon-sm"
            className={buttonClass}
            aria-label="Copy link"
            data-testid="copy-link-button"
            onClick={(event) => {
              stop(event);
              actions.copyLink(url);
            }}
          >
            {actions.isCopied ? (
              <Check className="size-3.5 text-primary" />
            ) : (
              <Copy className="size-3.5" />
            )}
          </Button>
        </ActionTooltip>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              className={buttonClass}
              aria-label="More actions"
              onClick={(event) => event.stopPropagation()}
            >
              <MoreHorizontal className="size-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-44">
            {canMarkRead(bookmarkType) ? (
              <DropdownMenuItem
                onClick={() => void actions.setRead(bookmarkId, !read)}
              >
                {read ? (
                  <BookOpen className="size-4" />
                ) : (
                  <BookOpenCheck className="size-4" />
                )}
                {read ? "Mark as unread" : "Mark as read"}
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuItem onClick={() => setTagDialogOpen(true)}>
              <Tags className="size-4" />
              Manage tags
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={() => {
                dialogManager.add({
                  title: "Delete bookmark?",
                  description: title
                    ? `“${title}” will be removed from your library.`
                    : "This bookmark will be removed from your library.",
                  action: {
                    label: "Delete",
                    onClick: () => {
                      trackAnalyticsEvent(ANALYTICS_EVENTS.BOOKMARK_DELETED, {
                        surface: "bookmark_card",
                      });
                      deleteBookmark.execute(bookmarkId);
                    },
                  },
                });
              }}
            >
              <Trash className="size-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        {children}
      </div>
      <BookmarkTagDialog
        open={tagDialogOpen}
        onOpenChange={setTagDialogOpen}
        bookmark={{ id: bookmarkId, title: title ?? null }}
      />
    </>
  );
};
