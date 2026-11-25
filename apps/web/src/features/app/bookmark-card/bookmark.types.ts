import { BookmarkType, BookmarkStatus } from "@/lib/bookmark-types";

export type BookmarkTag = {
  tag: {
    id: string;
    name: string;
    type: "USER" | "IA";
  };
};

export type BookmarkCardData = {
  id: string;
  url: string;
  type: BookmarkType | null;
  title: string | null;
  summary: string | null;
  ogImageUrl: string | null;
  metadata: unknown;
  starred: boolean;
  read: boolean;
  status: BookmarkStatus;
  faviconUrl: string | null;
  processingError?: string | null;
  userId?: string;
  imageDescription?: string | null;
  inngestRunId?: string | null;
  note?: string | null;
  updatedAt?: Date;
  vectorSummary?: string | null;
  preview?: string | null;
  ogDescription?: string | null;
  createdAt?: Date | number;
  tags?: BookmarkTag[];
  processingStep?: number | null;
  openCount?: number;
};

/**
 * Field-level equality for memoized cards and rows. Convex hands back new
 * objects for every row of a page whenever one row changes, so identity is
 * useless: without this a single save re-renders the whole library.
 */
export function sameBookmarkCardData(a: BookmarkCardData, b: BookmarkCardData) {
  if (a === b) return true;
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]) as Set<
    keyof BookmarkCardData
  >;
  for (const key of keys) {
    const left = a[key];
    const right = b[key];
    if (Object.is(left, right)) continue;
    if (
      typeof left !== "object" ||
      typeof right !== "object" ||
      left === null ||
      right === null ||
      JSON.stringify(left) !== JSON.stringify(right)
    ) {
      return false;
    }
  }
  return true;
}
