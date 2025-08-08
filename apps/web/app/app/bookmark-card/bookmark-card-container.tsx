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
import { ReactNode, useState, memo } from "react";
import { useDeleteBookmark } from "../bookmark-page/delete-button";
import { usePrefetchBookmark } from "../bookmark-page/use-bookmark";
import { BookmarkTagDialog } from "./bookmark-tag-dialog";
import { BookmarkTag } from "./bookmark.types";

interface BookmarkCardContainerProps {
  bookmark: {
    id: string;
    url: string;
    status: BookmarkStatus;
    title?: string | null;
    tags?: BookmarkTag[];
  };
  children: ReactNode;
  className?: string;
  onMouseEnter?: () => void;
  ref?: React.RefObject<HTMLDivElement | null>;
  testId?: string;
}

const BookmarkCardContainerComponent = ({
  bookmark,
  children,
  className = "",
  onMouseEnter,
  ref,
  testId,
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
              "group gap-4 overflow-hidden p-0 h-fit max-h-[var(--card-height)]",
              className,
            )}
            onMouseEnter={handleMouseEnter}
            data-testid={testId}
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
          tags: bookmark.tags,
        }}
      />
    </>
  );
};

// Memoize the container component for better virtualization performance
export const BookmarkCardContainer = memo(BookmarkCardContainerComponent, (prevProps, nextProps) => {
  // Deep comparison for bookmark object since it contains nested properties
  return (
    prevProps.bookmark.id === nextProps.bookmark.id &&
    prevProps.bookmark.url === nextProps.bookmark.url &&
    prevProps.bookmark.status === nextProps.bookmark.status &&
    prevProps.bookmark.title === nextProps.bookmark.title &&
    JSON.stringify(prevProps.bookmark.tags) === JSON.stringify(nextProps.bookmark.tags) &&
    prevProps.className === nextProps.className &&
    prevProps.testId === nextProps.testId
  );
});
