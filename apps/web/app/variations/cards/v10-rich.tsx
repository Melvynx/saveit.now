"use client";

import { ImageWithPlaceholder } from "@/components/image-with-placeholder";
import { cn } from "@workspace/ui/lib/utils";
import type { CardProps } from "../types";

export function CardV10Rich({ bookmark }: CardProps) {
  const domain = new URL(bookmark.url).hostname.replace("www.", "");
  const imageUrl = bookmark.preview ?? bookmark.ogImageUrl ?? "";

  return (
    <div className={cn("bg-card border rounded-xl overflow-hidden")}>
      {imageUrl && (
        <div className="h-[180px] w-full overflow-hidden">
          <ImageWithPlaceholder
            src={imageUrl}
            alt={bookmark.title ?? ""}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      <div className="p-4 space-y-1">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {bookmark.faviconUrl && (
            <img src={bookmark.faviconUrl} alt="" className="w-4 h-4 rounded flex-shrink-0" />
          )}
          <span className="truncate">{domain}</span>
        </div>
        <h3 className="text-sm font-semibold line-clamp-2">{bookmark.title}</h3>
        {bookmark.summary && (
          <p className="text-xs text-muted-foreground line-clamp-2">{bookmark.summary}</p>
        )}
      </div>
    </div>
  );
}
