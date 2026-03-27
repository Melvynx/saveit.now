"use client";

import { cn } from "@workspace/ui/lib/utils";
import { ImageWithPlaceholder } from "@/components/image-with-placeholder";
import type { CardProps } from "../types";

export function CardV1Current({ bookmark }: CardProps) {
  const imageUrl = bookmark.preview ?? bookmark.ogImageUrl ?? "";
  const domain = new URL(bookmark.url).hostname.replace("www.", "");

  return (
    <div className={cn("rounded-xl border bg-card overflow-hidden")}>
      <div className="relative">
        <ImageWithPlaceholder
          src={imageUrl}
          alt={bookmark.title ?? ""}
          width={400}
          height={200}
          className="w-full h-[200px] object-cover"
        />
      </div>

      <div className="p-3 space-y-1">
        <div className="flex items-center gap-2">
          {bookmark.faviconUrl && (
            <img src={bookmark.faviconUrl} alt="" width={16} height={16} className="flex-shrink-0" />
          )}
          <span className="text-xs text-muted-foreground truncate">{domain}</span>
        </div>
        <h3 className="font-semibold text-sm line-clamp-2">{bookmark.title}</h3>
      </div>
    </div>
  );
}
