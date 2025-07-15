/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@workspace/ui/components/button";
import { InlineTooltip } from "@workspace/ui/components/tooltip";
import { cn } from "@workspace/ui/lib/utils";
import { Star } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { toast } from "sonner";
import { toggleStarBookmarkAction } from "./bookmarks.action";

interface StarButtonProps {
  bookmarkId: string;
  starred: boolean;
  variant?: "default" | "secondary" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  showTooltip?: boolean;
}

export const StarButton = ({
  bookmarkId,
  starred,
  variant = "outline",
  size = "icon",
  className = "",
  showTooltip = true,
}: StarButtonProps) => {
  const queryClient = useQueryClient();

  const toggleStarAction = useAction(toggleStarBookmarkAction, {
    onError: (error) => {
      // Revert optimistic updates on error
      queryClient.invalidateQueries({ queryKey: ["bookmarks"] });
      queryClient.invalidateQueries({ queryKey: ["bookmark", bookmarkId] });
      toast.error(error.error.serverError?.message || "Failed to update star");
    },
  });

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();

    // Optimistic update for bookmarks list
    queryClient.setQueriesData({ queryKey: ["bookmarks"] }, (oldData: any) => {
      if (!oldData?.pages) return oldData;

      return {
        ...oldData,
        pages: oldData.pages.map((page: any) => ({
          ...page,
          bookmarks: page.bookmarks.map((bookmark: any) =>
            bookmark.id === bookmarkId
              ? { ...bookmark, starred: !starred }
              : bookmark,
          ),
        })),
      };
    });

    // Optimistic update for individual bookmark
    queryClient.setQueryData(["bookmark", bookmarkId], (oldData: any) => {
      if (!oldData?.bookmark) return oldData;
      return {
        ...oldData,
        bookmark: {
          ...oldData.bookmark,
          starred: !starred,
        },
      };
    });

    toggleStarAction.execute({ bookmarkId });
  };

  const button = (
    <Button
      variant={variant}
      size={size}
      className={cn(size === "icon" && "size-8", className)}
      onClick={handleClick}
      disabled={toggleStarAction.isExecuting}
      data-testid="star-button"
    >
      <Star
        className={cn(
          "size-4",
          starred ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground",
        )}
      />
    </Button>
  );

  if (!showTooltip) {
    return button;
  }

  return (
    <InlineTooltip title={starred ? "Unstar" : "Star"}>{button}</InlineTooltip>
  );
};
