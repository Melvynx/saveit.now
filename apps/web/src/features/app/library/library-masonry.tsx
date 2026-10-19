import { cn } from "@workspace/ui/lib/utils";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { BookmarkCard } from "../bookmark-card";
import { getMetadataRatio } from "../bookmark-card/bookmark-card-parts";
import type { BookmarkCardData } from "../bookmark-card/bookmark.types";
import { LibraryGridItem } from "./library-item";

// Minimum column width; columns stretch to fill, landing around 280px.
const COLUMN_WIDTH = 256;
const GAP = 16;
const MOBILE_GAP = 12;
const MOBILE_BREAKPOINT = 640;

/** Rough card height / width, only used to balance columns. */
function estimateHeight(bookmark: BookmarkCardData) {
  if (bookmark.status === "ERROR") return 0.55;
  if (bookmark.status === "PENDING" || bookmark.status === "PROCESSING") {
    return 0.7;
  }
  const hasImage = Boolean(bookmark.preview || bookmark.ogImageUrl);
  switch (bookmark.type) {
    case "TWEET":
      return 0.85;
    case "YOUTUBE":
      return 0.56 + 0.3;
    case "IMAGE": {
      const ratio = getMetadataRatio(bookmark.metadata) ?? 1.3;
      return 1 / Math.min(2, Math.max(0.75, ratio));
    }
    case "PDF":
      return 1.05;
    case "PRODUCT":
      return 0.87 + 0.3;
    default:
      return (hasImage ? 0.6 : 0.62) + (bookmark.summary ? 0.42 : 0.28);
  }
}

function useColumnCount() {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    setWidth(element.clientWidth);
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setWidth(entry.contentRect.width);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const mobile = width > 0 && width < MOBILE_BREAKPOINT;
  const gap = mobile ? MOBILE_GAP : GAP;
  const columns = mobile
    ? 2
    : Math.max(1, Math.floor((width + gap) / (COLUMN_WIDTH + gap)));

  return { ref, columns: width === 0 ? 0 : columns, gap };
}

/**
 * Row-first masonry: each card goes to the currently shortest column (by
 * estimated height). Assignment only depends on earlier items, so loading
 * more pages appends without reshuffling what is already on screen.
 */
export function LibraryMasonry({
  bookmarks,
  className,
}: {
  bookmarks: BookmarkCardData[];
  className?: string;
}) {
  const { ref, columns, gap } = useColumnCount();

  const layout = useMemo(() => {
    if (columns === 0) return [];
    const heights = new Array<number>(columns).fill(0);
    const cols: BookmarkCardData[][] = Array.from({ length: columns }, () => []);
    for (const bookmark of bookmarks) {
      let target = 0;
      for (let i = 1; i < columns; i++) {
        // Small bias keeps near-ties in reading order (left to right).
        if (heights[i]! < heights[target]! - 0.08) target = i;
      }
      cols[target]!.push(bookmark);
      heights[target]! += estimateHeight(bookmark) + 0.06;
    }
    return cols;
  }, [bookmarks, columns]);

  return (
    <div
      ref={ref}
      className={cn("flex w-full items-start", className)}
      style={{ gap }}
      data-testid="library-masonry"
    >
      {layout.map((column, columnIndex) => (
        <div
          key={columnIndex}
          className="flex min-w-0 flex-1 flex-col"
          style={{ gap }}
        >
          {column.map((bookmark) => (
            <LibraryGridItem
              key={bookmark.id}
              id={bookmark.id}
              label={bookmark.title || bookmark.url}
            >
              <BookmarkCard bookmark={bookmark} />
            </LibraryGridItem>
          ))}
        </div>
      ))}
    </div>
  );
}
