"use client";

import { cn } from "@workspace/ui/lib/utils";
import { ImageWithPlaceholder } from "@/components/image-with-placeholder";
import type { CardProps } from "../types";

export function CardV4Glass({ bookmark }: CardProps) {
  const imageUrl = bookmark.preview ?? bookmark.ogImageUrl ?? "";
  const domain = new URL(bookmark.url).hostname.replace("www.", "");

  return (
    <div className={cn("rounded-xl overflow-hidden relative aspect-[384/290] border border-border/50")}>
      <div className="absolute inset-0">
        <ImageWithPlaceholder
          src={imageUrl}
          alt={bookmark.title ?? ""}
          className="absolute inset-0 w-full h-full object-cover blur-sm"
        />
      </div>
      <div className="absolute inset-0 bg-card/80" />

      <div className="relative z-10 p-5 flex flex-col justify-between h-full">
        <div>
          {imageUrl && (
            <ImageWithPlaceholder
              src={imageUrl}
              alt={bookmark.title ?? ""}
              width={48}
              height={48}
              className="rounded-lg object-cover border border-border/50"
            />
          )}
        </div>
        <div>
          <h3 className="text-sm font-semibold line-clamp-2">{bookmark.title}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{domain}</p>
        </div>
      </div>
    </div>
  );
}
