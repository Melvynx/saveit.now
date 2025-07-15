"use client";

import { useConfirm } from "@/hooks/use-confirm";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";
import { BookmarkStatus } from "@workspace/database";
import { Card } from "@workspace/ui/components/card";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@workspace/ui/components/context-menu";
import { Check, CircleAlert, Copy, Trash } from "lucide-react";
import { ReactNode } from "react";
import { useDeleteBookmark } from "../bookmark-page/delete-button";
import { usePrefetchBookmark } from "../bookmark-page/use-bookmark";

interface BookmarkCardContainerProps {
  bookmark: { id: string; url: string; status: BookmarkStatus };
  children: ReactNode;
  className?: string;
  onMouseEnter?: () => void;
  ref?: React.RefObject<HTMLDivElement | null>;
  testId?: string;
}

export const BookmarkCardContainer = ({
  bookmark,
  children,
  className = "",
  onMouseEnter,
  ref,
  testId,
}: BookmarkCardContainerProps) => {
  const prefetch = usePrefetchBookmark();
  const { copyToClipboard, isCopied } = useCopyToClipboard(5000);
  const deleteBookmark = useDeleteBookmark();
  const { action: deleteBookmarkAction, isConfirm } = useConfirm(
    () => deleteBookmark.execute({ bookmarkId: bookmark.id }),
    5000,
  );

  const handleMouseEnter = () => {
    prefetch(bookmark.id);
    onMouseEnter?.();
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger>
        <Card
          ref={ref}
          className={`group w-full gap-4 overflow-hidden p-0 h-[var(--card-height)] ${className}`}
          onMouseEnter={handleMouseEnter}
          data-testid={testId}
        >
          {children}
        </Card>
      </ContextMenuTrigger>
      <ContextMenuContent>
        {bookmark.status === "READY" && (
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
  );
};
