"use client";

import { cn } from "@workspace/ui/lib/utils";
import type { CardProps } from "../types";

export function CardV2Compact({ bookmark }: CardProps) {
  const domain = new URL(bookmark.url).hostname.replace("www.", "");

  return (
    <div className={cn("border rounded-lg bg-card p-3")}>
      <div className="flex items-center gap-2">
        {bookmark.faviconUrl ? (
          <img src={bookmark.faviconUrl} alt="" className="w-3.5 h-3.5 flex-shrink-0" />
        ) : (
          <div className="w-3.5 h-3.5 rounded-sm bg-muted flex-shrink-0" />
        )}
        <span className="text-xs text-muted-foreground uppercase tracking-wider truncate">{domain}</span>
      </div>
      <h3 className="font-medium text-sm line-clamp-1 mt-1">{bookmark.title}</h3>
    </div>
  );
}
