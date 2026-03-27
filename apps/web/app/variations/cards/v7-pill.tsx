"use client";

import { cn } from "@workspace/ui/lib/utils";
import type { CardProps } from "../types";

export function CardV7Pill({ bookmark }: CardProps) {
  const domain = new URL(bookmark.url).hostname.replace("www.", "");
  const firstLetter = domain.charAt(0).toUpperCase();

  return (
    <div className={cn("flex flex-col gap-3 rounded-2xl border bg-card p-4")}>
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border bg-muted">
          {bookmark.faviconUrl ? (
            <img src={bookmark.faviconUrl} alt="" className="h-4 w-4 rounded-full" />
          ) : (
            <span className="text-xs font-semibold text-muted-foreground">{firstLetter}</span>
          )}
        </div>
        <span className="text-xs text-muted-foreground">{domain}</span>
      </div>
      <h3 className="line-clamp-2 text-sm font-medium">{bookmark.title}</h3>
    </div>
  );
}
