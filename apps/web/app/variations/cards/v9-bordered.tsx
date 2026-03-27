"use client";

import { ImageWithPlaceholder } from "@/components/image-with-placeholder";
import { cn } from "@workspace/ui/lib/utils";
import type { CardProps } from "../types";

const ACCENT_COLORS = ["bg-primary", "bg-destructive", "bg-accent-foreground", "bg-secondary-foreground", "bg-muted-foreground"];

function getAccentColor(url: string): string {
  let hash = 0;
  for (let i = 0; i < url.length; i++) {
    hash = ((hash << 5) - hash + url.charCodeAt(i)) | 0;
  }
  return ACCENT_COLORS[Math.abs(hash) % ACCENT_COLORS.length] ?? "bg-primary";
}

export function CardV9Bordered({ bookmark }: CardProps) {
  const imageUrl = bookmark.preview ?? bookmark.ogImageUrl ?? "";
  const domain = new URL(bookmark.url).hostname.replace("www.", "");
  const accentColor = getAccentColor(bookmark.url);

  return (
    <div className={cn("bg-background border-2 border-border rounded-xl overflow-hidden")}>
      <div className={cn("h-1", accentColor)} />
      <div className="p-4">
        <ImageWithPlaceholder
          src={imageUrl}
          alt={bookmark.title ?? ""}
          width={200}
          height={160}
          className="h-40 w-full rounded-lg object-cover"
        />
        <h3 className="text-sm font-semibold mt-3 line-clamp-2">{bookmark.title}</h3>
        <p className="text-xs text-muted-foreground mt-1">{domain}</p>
      </div>
    </div>
  );
}
