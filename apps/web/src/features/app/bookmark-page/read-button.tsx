"use client";

import { api } from "@convex/_generated/api";
import { Button } from "@workspace/ui/components/button";
import { InlineTooltip } from "@workspace/ui/components/tooltip";
import { cn } from "@workspace/ui/lib/utils";
import { useMutation } from "convex/react";
import { BookOpen } from "lucide-react";
import { useState } from "react";
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
  const setRead = useMutation(api.bookmarks.mutations.setRead);
  const [isPending, setIsPending] = useState(false);

  const toggleRead = () => {
    setIsPending(true);
    void setRead({
        id: bookmarkId as Id<"bookmarks">,
        read: !read,
      })
      .catch((error) => {
        toast.error(
          error instanceof Error
            ? error.message
            : "Failed to update read state",
        );
      })
      .finally(() => setIsPending(false));
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleRead();
  };

  const button = (
    <Button
      variant={variant}
      size={size}
      className={cn(size === "icon" && "size-8", className)}
      onClick={handleClick}
      disabled={isPending}
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
