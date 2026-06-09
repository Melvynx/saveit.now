"use client";

import { api } from "@convex/_generated/api";
import { useConvexMutation } from "@convex-dev/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@workspace/ui/components/button";
import { InlineTooltip } from "@workspace/ui/components/tooltip";
import { cn } from "@workspace/ui/lib/utils";
import { BookOpen } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import type { Id } from "@convex/_generated/dataModel";

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
  const setRead = useConvexMutation(api.bookmarks.mutations.setRead);

  const toggleReadAction = useMutation({
    mutationFn: () =>
      setRead({
        id: bookmarkId as Id<"bookmarks">,
        read: !read,
      }),
    onError: (error) => {
      queryClient.invalidateQueries({ queryKey: ["bookmarks"] });
      toast.error(
        error instanceof Error ? error.message : "Failed to update read state",
      );
    },
  });

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
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
