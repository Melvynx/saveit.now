"use client";

import { useConfirm } from "@/hooks/use-confirm";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";
import { BookmarkStatus } from "@/lib/bookmark-types";
import { Card } from "@workspace/ui/components/card";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@workspace/ui/components/context-menu";
import { cn } from "@workspace/ui/lib/utils";
import { Check, CircleAlert, Copy, Tags, Trash } from "lucide-react";
import { ComponentProps, useState } from "react";
import { useDeleteBookmark } from "../bookmark-page/delete-button";
import { usePrefetchBookmark } from "../bookmark-page/use-bookmark";
import { BookmarkTagDialog } from "./bookmark-tag-dialog";
import { BookmarkTag } from "./bookmark.types";

type BookmarkCardContainerProps = {
  bookmark: {
    id: string;
    url: string;
    status: BookmarkStatus;
    title?: string | null;
    tags?: BookmarkTag[];
  };
  onMouseEnter?: () => void;
  testId?: string;
  /** Kept for backward compatibility: cards always size to their content. */
  fitContent?: boolean;
} & ComponentProps<"div">;

export const bookmarkCardClassName =
  "group/card relative isolate gap-0 overflow-hidden rounded-xl bg-card p-0 text-card-foreground ring-1 ring-foreground/7 transition-[box-shadow,translate] duration-200 ease-(--ease-out-soft) hover:-translate-y-0.5 hover:shadow-[0_8px_24px_-12px_color-mix(in_oklch,var(--foreground)_22%,transparent)] hover:ring-foreground/12 motion-reduce:transition-none motion-reduce:hover:translate-y-0";

export const BookmarkCardContainer = ({
  bookmark,
  children,
  className = "",
  onMouseEnter,
  ref,
  testId,
  fitContent,
  ...props
}: BookmarkCardContainerProps) => {
  const [tagDialogOpen, setTagDialogOpen] = useState(false);
  const prefetch = usePrefetchBookmark();
  const { copyToClipboard, isCopied } = useCopyToClipboard(5000);
  const deleteBookmark = useDeleteBookmark();
  const { action: deleteBookmarkAction, isConfirm } = useConfirm(
    () => deleteBookmark.execute(bookmark.id),
    5000,
  );

  const handleMouseEnter = () => {
    prefetch(bookmark.id);
    onMouseEnter?.();
  };

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <Card
            ref={ref}
            className={cn(bookmarkCardClassName, className)}
            onMouseEnter={handleMouseEnter}
            data-testid={testId}
            data-fit-content={fitContent || undefined}
            {...props}
          >
            {children}
          </Card>
        </ContextMenuTrigger>
        <ContextMenuContent>
          {bookmark.status === "READY" && (
            <>
              <ContextMenuItem
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setTagDialogOpen(true);
                }}
              >
                <Tags className="size-4" />
                <span>Manage tags</span>
              </ContextMenuItem>
              <ContextMenuSeparator />
              <ContextMenuItem
                closeOnClick={isConfirm}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  deleteBookmarkAction();
                }}
              >
                {isConfirm ? (
                  <CircleAlert className="size-4" />
                ) : (
                  <Trash className="size-4" />
                )}
                <span>{isConfirm ? "Are you sure?" : "Delete"}</span>
              </ContextMenuItem>
            </>
          )}
          <ContextMenuItem
            onClick={() => {
              copyToClipboard(bookmark.url);
            }}
          >
            {isCopied ? (
              <Check className="size-4" />
            ) : (
              <Copy className="size-4" />
            )}
            <span>Copy link</span>
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      <BookmarkTagDialog
        open={tagDialogOpen}
        onOpenChange={setTagDialogOpen}
        bookmark={{
          id: bookmark.id,
          title: bookmark.title || null,
        }}
      />
    </>
  );
};
