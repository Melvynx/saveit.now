"use client";

import { api } from "@convex/_generated/api";
import { Button } from "@workspace/ui/components/button";
import { InlineTooltip } from "@workspace/ui/components/tooltip";
import { cn } from "@workspace/ui/lib/utils";
import { useMutation } from "convex/react";
import { Star } from "lucide-react";
import { useState } from "react";
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
  const setStarred = useMutation(api.bookmarks.mutations.setStarred);
  const [isPending, setIsPending] = useState(false);

  const toggleStar = () => {
    setIsPending(true);
    void setStarred({
        id: bookmarkId as Id<"bookmarks">,
        starred: !starred,
      })
      .catch((error) => {
        toast.error(
          error instanceof Error ? error.message : "Failed to update star",
        );
      })
      .finally(() => setIsPending(false));
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleStar();
  };

  const button = (
    <Button
      variant={variant}
      size={size}
      className={cn(size === "icon" && "size-8", className)}
      onClick={handleClick}
      disabled={isPending}
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
