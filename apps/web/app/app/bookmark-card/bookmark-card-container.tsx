"use client";

import { useConfirm } from "@/hooks/use-confirm";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";
import { BookmarkStatus } from "@workspace/database";
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
} & ComponentProps<"div">;

export const BookmarkCardContainer = ({
  bookmark,
  children,
  className = "",
  onMouseEnter,
  ref,
  testId,
  ...props
}: BookmarkCardContainerProps) => {
  const [tagDialogOpen, setTagDialogOpen] = useState(false);
  const prefetch = usePrefetchBookmark();
  const { copyToClipboard, isCopied } = useCopyToClipboard(5000);
  const deleteBookmark = useDeleteBookmark();
  const { action: deleteBookmarkAction, isConfirm } = useConfirm(
    () => deleteBookmark.mutate(bookmark.id),
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
            className={cn(
              "group gap-4 overflow-hidden p-0 h-fit aspect-[384/290]",
              className,
            )}
            onMouseEnter={handleMouseEnter}
            data-testid={testId}
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
            <span>Copy Link</span>
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
