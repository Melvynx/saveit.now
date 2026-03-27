"use client";

import { cn } from "@workspace/ui/lib/utils";
import { ImageWithPlaceholder } from "@/components/image-with-placeholder";
import type { CardProps } from "../types";

export function CardV6Overlay({ bookmark }: CardProps) {
  const domain = new URL(bookmark.url).hostname.replace("www.", "");
  const imageUrl = bookmark.preview ?? bookmark.ogImageUrl;

  return (
    <div className="rounded-xl overflow-hidden relative aspect-[384/290] group">
      {imageUrl ? (
        <>
          <ImageWithPlaceholder
            src={imageUrl}
            alt={bookmark.title ?? ""}
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        </>
      ) : (
        <div className="absolute inset-0 bg-muted flex items-center justify-center">
          <span className="text-6xl font-bold text-muted-foreground/30">
            {domain.charAt(0).toUpperCase()}
          </span>
        </div>
      )}

      <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
        <p className="text-xs opacity-70 truncate">{domain}</p>
        <h3 className="text-sm font-semibold line-clamp-2">{bookmark.title}</h3>
      </div>
    </div>
  );
}
