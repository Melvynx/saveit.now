"use client";

import { cn } from "@workspace/ui/lib/utils";
import { ImageWithPlaceholder } from "@/components/image-with-placeholder";
import type { CardProps } from "../types";

export function CardV5Stacked({ bookmark }: CardProps) {
  const imageUrl = bookmark.preview ?? bookmark.ogImageUrl ?? "";
  const domain = new URL(bookmark.url).hostname.replace("www.", "");

  return (
    <div className="relative pb-2 pr-2">
      <div className={cn("absolute bottom-0 right-0 w-[calc(100%-8px)] h-[calc(100%-8px)] bg-card border rounded-xl translate-x-2 translate-y-2 opacity-40 pointer-events-none")} />
      <div className={cn("absolute bottom-0 right-0 w-[calc(100%-4px)] h-[calc(100%-4px)] bg-card border rounded-xl translate-x-1 translate-y-1 opacity-60 pointer-events-none")} />
      <div className="relative z-10 bg-card border rounded-xl overflow-hidden">
        <ImageWithPlaceholder
          src={imageUrl}
          alt={bookmark.title ?? ""}
          className="w-full h-[180px] object-cover"
        />
        <div className="p-4">
          <h3 className="text-sm font-semibold line-clamp-2">{bookmark.title}</h3>
          <p className="text-xs text-muted-foreground mt-1">{domain}</p>
        </div>
      </div>
    </div>
  );
}
