"use client";

import { cn } from "@workspace/ui/lib/utils";
import { ImageWithPlaceholder } from "@/components/image-with-placeholder";
import type { CardProps } from "../types";

export function CardV3Horizontal({ bookmark }: CardProps) {
  const domain = new URL(bookmark.url).hostname.replace("www.", "");
  const imageUrl = bookmark.preview ?? bookmark.ogImageUrl ?? "";

  return (
    <div className={cn("border rounded-xl overflow-hidden flex flex-row h-[120px] bg-card")}>
      <ImageWithPlaceholder
        src={imageUrl}
        alt={bookmark.title ?? ""}
        className="w-[120px] h-[120px] flex-shrink-0 object-cover"
      />
      <div className="flex flex-col justify-center p-3 flex-1 min-w-0">
        <p className="text-xs text-muted-foreground truncate">{domain}</p>
        <h3 className="text-sm font-semibold line-clamp-2 mt-0.5">{bookmark.title}</h3>
      </div>
    </div>
  );
}
