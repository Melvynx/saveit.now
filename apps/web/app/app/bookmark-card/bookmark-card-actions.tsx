"use client";

import { Button } from "@workspace/ui/components/button";
import { ExternalLink } from "lucide-react";
import Link from "next/link";

import { CopyLinkButton } from "../bookmark-page/bookmark-actions-button";

interface BookmarkCardActionsProps {
  url: string;
  className?: string;
  children?: React.ReactNode;
}

export const BookmarkCardActions = ({
  url,
  className = "",
  children,
}: BookmarkCardActionsProps) => {
  return (
    <div
      className={`absolute right-2 top-2 flex items-center gap-1 opacity-0 transition-opacity duration-200 group-hover:opacity-100 ${className}`}
    >
      <Button
        variant="secondary"
        size="icon"
        className="size-8 hover:bg-accent"
        asChild
        onClick={(e) => e.stopPropagation()}
      >
        <Link href={url} target="_blank">
          <ExternalLink className="text-muted-foreground size-4" />
        </Link>
      </Button>
      <CopyLinkButton
        url={url}
        variant="secondary"
        size="icon"
        className="size-8 hover:bg-accent"
      />
      {children}
    </div>
  );
};
