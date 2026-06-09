"use client";

import { api } from "@convex/_generated/api";
import { useConvexMutation } from "@convex-dev/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@workspace/ui/components/button";
import { InlineTooltip } from "@workspace/ui/components/tooltip";
import { cn } from "@workspace/ui/lib/utils";
import { Star } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import type { Id } from "@convex/_generated/dataModel";

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
  const setStarred = useConvexMutation(api.bookmarks.mutations.setStarred);

  const toggleStarAction = useMutation({
    mutationFn: () =>
      setStarred({
        id: bookmarkId as Id<"bookmarks">,
        starred: !starred,
      }),
    onError: (error) => {
      // Revert optimistic updates on error
      queryClient.invalidateQueries({ queryKey: ["bookmarks"] });
      toast.error(
        error instanceof Error ? error.message : "Failed to update star",
      );
    },
  });

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleStarAction.mutate();
  };

  const button = (
    <Button
      variant={variant}
      size={size}
      className={cn(size === "icon" && "size-8", className)}
      onClick={handleClick}
      disabled={toggleStarAction.isPending}
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
