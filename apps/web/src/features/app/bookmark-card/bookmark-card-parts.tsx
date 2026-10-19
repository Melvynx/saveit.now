"use client";

import { BookmarkType } from "@/lib/bookmark-types";
import { cn } from "@workspace/ui/lib/utils";
import { useEffect, useState, type ReactNode } from "react";
import { BookmarkFavicon } from "../bookmark-favicon";
import { HighlightedTitle } from "../library/library-card-context";
import { LinkWithQuery } from "./link-with-query";

export function getDomain(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export function getMetadataRatio(metadata: unknown): number | null {
  if (!metadata || typeof metadata !== "object") return null;
  const width = Reflect.get(metadata, "width");
  const height = Reflect.get(metadata, "height");
  if (typeof width !== "number" || typeof height !== "number" || height <= 0) {
    return null;
  }
  return width / height;
}

type CardMediaProps = {
  src?: string | null;
  fallbackSrc?: string | null;
  alt: string;
  /** Width / height bounds; the image's natural ratio is clamped into them. */
  minRatio?: number;
  maxRatio?: number;
  initialRatio?: number | null;
  /** Rendered instead of the media box when no image can be loaded. */
  fallback: ReactNode;
  className?: string;
  imgClassName?: string;
  /** Called once every source failed and `fallback` is shown. */
  onUnavailable?: () => void;
  children?: ReactNode;
};

/**
 * Image block sized to the picture's natural aspect ratio (clamped), with a
 * soft skeleton while loading. Swaps to `fallback` when every source fails, so
 * a card never shows an empty image box.
 */
export function CardMedia({
  src,
  fallbackSrc,
  alt,
  minRatio = 4 / 3,
  maxRatio = 16 / 9,
  initialRatio,
  fallback,
  className,
  imgClassName,
  onUnavailable,
  children,
}: CardMediaProps) {
  const sources = [src, fallbackSrc].filter(
    (value, index, all): value is string =>
      Boolean(value) && all.indexOf(value) === index,
  );
  const sourcesKey = sources.join("|");
  const [sourceIndex, setSourceIndex] = useState(0);
  const [ratio, setRatio] = useState<number | null>(initialRatio ?? null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setSourceIndex(0);
    setLoaded(false);
  }, [sourcesKey]);

  const activeSrc = sources[sourceIndex];

  useEffect(() => {
    if (!activeSrc) onUnavailable?.();
  }, [activeSrc, onUnavailable]);

  if (!activeSrc) return <>{fallback}</>;

  const aspect = clamp(ratio ?? (minRatio + maxRatio) / 2, minRatio, maxRatio);

  return (
    <div
      className={cn("relative w-full overflow-hidden bg-muted", className)}
      style={{ aspectRatio: aspect }}
    >
      <img
        src={activeSrc}
        alt={alt}
        loading="lazy"
        decoding="async"
        draggable={false}
        className={cn(
          "absolute inset-0 size-full object-cover object-top transition-opacity duration-300 ease-(--ease-out-soft)",
          loaded ? "opacity-100" : "opacity-0",
          imgClassName,
        )}
        onLoad={(event) => {
          const { naturalWidth, naturalHeight } = event.currentTarget;
          if (naturalWidth > 1 && naturalHeight > 1) {
            setRatio(naturalWidth / naturalHeight);
            setLoaded(true);
            return;
          }
          setSourceIndex((index) => index + 1);
        }}
        onError={() => setSourceIndex((index) => index + 1)}
      />
      {!loaded ? (
        <div className="absolute inset-0 animate-pulse bg-muted" aria-hidden />
      ) : null}
      {children}
    </div>
  );
}

type CardFallbackTileProps = {
  title: string;
  faviconUrl: string | null;
  type: BookmarkType | null;
  className?: string;
};

/** No-image fallback: serif title on a soft muted tile with the favicon. */
export function CardFallbackTile({
  title,
  faviconUrl,
  type,
  className,
}: CardFallbackTileProps) {
  return (
    <div
      className={cn(
        "relative flex min-h-36 flex-col justify-between gap-6 bg-muted/70 p-4",
        className,
      )}
    >
      <span className="flex size-7 items-center justify-center rounded-md bg-card shadow-xs ring-1 ring-foreground/6">
        <BookmarkFavicon faviconUrl={faviconUrl} bookmarkType={type ?? "PAGE"} />
      </span>
      <p className="line-clamp-4 font-serif text-[20px] leading-[1.2] font-medium tracking-[-0.01em] text-balance text-foreground">
        <HighlightedTitle text={title} />
      </p>
    </div>
  );
}

export function UnreadDot({ className }: { className?: string }) {
  return (
    <span
      className={cn("size-1.5 shrink-0 rounded-full bg-primary", className)}
      aria-label="Unread"
      role="img"
    />
  );
}

export const isUnread = (bookmark: { type: string | null; read: boolean }) =>
  (bookmark.type === "ARTICLE" || bookmark.type === "YOUTUBE") &&
  !bookmark.read;

type CardBodyProps = {
  title?: string | null;
  summary?: string | null;
  domain: string;
  faviconUrl: string | null;
  type: BookmarkType | null;
  unread?: boolean;
  meta?: ReactNode;
  className?: string;
};

/** Title (2 lines), summary (2 lines) and favicon + domain footer. */
export function CardBody({
  title,
  summary,
  domain,
  faviconUrl,
  type,
  unread,
  meta,
  className,
}: CardBodyProps) {
  return (
    <div className={cn("flex flex-col gap-1 px-3.5 pt-3 pb-3", className)}>
      {title ? (
        <h3 className="line-clamp-2 text-[14px] leading-snug font-semibold tracking-[-0.005em] text-pretty text-foreground">
          <HighlightedTitle text={title} />
        </h3>
      ) : null}
      {summary ? (
        <p className="line-clamp-2 text-[13px] leading-[1.45] text-muted-foreground">
          {summary}
        </p>
      ) : null}
      <CardFooter
        domain={domain}
        faviconUrl={faviconUrl}
        type={type}
        unread={unread}
        meta={meta}
      />
    </div>
  );
}

export function CardFooter({
  domain,
  faviconUrl,
  type,
  unread,
  meta,
  className,
}: {
  domain: string;
  faviconUrl: string | null;
  type: BookmarkType | null;
  unread?: boolean;
  meta?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mt-1 flex min-w-0 items-center gap-1.5 text-[12px] text-muted-foreground",
        className,
      )}
    >
      <span className="flex size-3.5 shrink-0 items-center justify-center [&_svg]:size-3.5 [&>*]:size-3.5">
        <BookmarkFavicon faviconUrl={faviconUrl} bookmarkType={type ?? "PAGE"} />
      </span>
      <span className="min-w-0 truncate">{domain}</span>
      {meta}
      {unread ? <UnreadDot className="ml-auto" /> : null}
    </div>
  );
}

/** Whole-card link to the detail view (keeps the LinkWithQuery mask contract). */
export function CardLink({
  bookmarkId,
  label,
  className,
  children,
}: {
  bookmarkId: string;
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <LinkWithQuery
      to={`/app/b/${bookmarkId}`}
      aria-label={label}
      data-card-link=""
      className={cn(
        "flex min-w-0 flex-col rounded-[inherit] outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
        className,
      )}
    >
      {children}
    </LinkWithQuery>
  );
}
