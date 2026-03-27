"use client";

import { ImageWithPlaceholder } from "@/components/image-with-placeholder";
import type { CardProps } from "../types";

export function CardV8Newspaper({ bookmark }: CardProps) {
  const domain = new URL(bookmark.url).hostname.replace("www.", "");
  const imageUrl = bookmark.preview ?? bookmark.ogImageUrl ?? "";

  return (
    <div className="bg-card border border-border rounded-lg p-5">
      <div className="flex gap-4">
        <div className="flex-1 flex flex-col">
          <span className="text-xs uppercase tracking-wider text-primary font-semibold">
            {domain}
          </span>
          <h3 className="font-serif text-base font-semibold leading-tight line-clamp-3 mt-1">
            {bookmark.title}
          </h3>
        </div>

        {imageUrl && (
          <div className="flex-shrink-0">
            <ImageWithPlaceholder
              src={imageUrl}
              alt={bookmark.title ?? ""}
              width={64}
              height={64}
              className="rounded w-16 h-16 object-cover"
            />
          </div>
        )}
      </div>
    </div>
  );
}
