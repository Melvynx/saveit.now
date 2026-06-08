"use client";

import { useQueryClient } from "@tanstack/react-query";
import { upfetch } from "@/lib/up-fetch";
import { Button } from "@workspace/ui/components/button";
import { InlineTooltip } from "@workspace/ui/components/tooltip";
import { cn } from "@workspace/ui/lib/utils";
import { Bookmark } from "@workspace/database";
import { BookOpen } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

interface BookmarksPage {
  bookmarks: Bookmark[];
  hasMore: boolean;
}

interface BookmarksQueryData {
  pages: BookmarksPage[];
  pageParams: string[];
}

interface BookmarkQueryData {
  bookmark: Bookmark;
}

interface ReadButtonProps {
  bookmarkId: string;
  read: boolean;
  variant?: "default" | "secondary" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  showTooltip?: boolean;
}

export const ReadButton = ({
  bookmarkId,
  read,
  variant = "outline",
  size = "icon",
  className = "",
  showTooltip = true,
}: ReadButtonProps) => {
  const queryClient = useQueryClient();

  const toggleReadAction = useMutation({
    mutationFn: () =>
      upfetch(`/api/bookmarks/${bookmarkId}`, {
        method: "PATCH",
        body: { read: !read },
      }),
    onError: (error) => {
      queryClient.invalidateQueries({ queryKey: ["bookmarks"] });
      queryClient.invalidateQueries({ queryKey: ["bookmark", bookmarkId] });
      toast.error(
        error instanceof Error ? error.message : "Failed to update read state",
      );
    },
  });

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();

    queryClient.setQueriesData({ queryKey: ["bookmarks"] }, (oldData: BookmarksQueryData | undefined) => {
      if (!oldData?.pages) return oldData;

      return {
        ...oldData,
        pages: oldData.pages.map((page) => ({
          ...page,
          bookmarks: page.bookmarks.map((bookmark) =>
            bookmark.id === bookmarkId
              ? { ...bookmark, read: !read }
              : bookmark,
          ),
        })),
      };
    });

    queryClient.setQueryData(["bookmark", bookmarkId], (oldData: BookmarkQueryData | undefined) => {
      if (!oldData?.bookmark) return oldData;
      return {
        ...oldData,
        bookmark: {
          ...oldData.bookmark,
          read: !read,
        },
      };
    });

    toggleReadAction.mutate();
  };

  const button = (
    <Button
      variant={variant}
      size={size}
      className={cn(size === "icon" && "size-8", className)}
      onClick={handleClick}
      disabled={toggleReadAction.isPending}
    >
      <BookOpen
        className={cn(
          "size-4",
          read ? "fill-primary text-primary" : "text-muted-foreground",
        )}
      />
    </Button>
  );

  if (!showTooltip) {
    return button;
  }

  return (
    <InlineTooltip title={read ? "Mark as unread" : "Mark as read"}>
      {button}
    </InlineTooltip>
  );
};
