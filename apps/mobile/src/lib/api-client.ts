/**
 * Type declarations shared by mobile UI components.
 *
 * The cookie-based REST ApiClient class has been removed. All data fetching now
 * goes through Convex hooks (convex/react). These types remain because the
 * BookmarkItem / TypeFilterBadges components depend on them at the type level.
 */

export type BookmarkType =
  | "VIDEO"
  | "ARTICLE"
  | "PAGE"
  | "IMAGE"
  | "YOUTUBE"
  | "TWEET"
  | "PDF"
  | "PRODUCT";

export const BOOKMARK_TYPES: BookmarkType[] = [
  "PAGE",
  "ARTICLE",
  "YOUTUBE",
  "TWEET",
  "VIDEO",
  "IMAGE",
  "PDF",
  "PRODUCT",
];

export interface UserLimits {
  bookmarks: number;
  monthlyBookmarkRuns: number;
  canExport: number;
  apiAccess: number;
}

export interface UserPlanResponse {
  plan: "free" | "pro";
  limits: UserLimits;
  subscription: {
    id: string;
    status: string;
    periodEnd: string;
  } | null;
}

interface TweetUser {
  name: string;
  screen_name: string;
  profile_image_url_https: string;
}

interface TweetMedia {
  media_url_https: string;
  type: string;
}

interface BookmarkMetadata {
  youtubeId?: string;
  tweetId?: string;
  text?: string;
  user?: TweetUser;
  mediaDetails?: TweetMedia[];
  width?: number;
  height?: number;
  price?: number;
  currency?: string;
  brand?: string;
}

export interface Bookmark {
  id: string;
  url: string;
  title?: string;
  preview?: string;
  starred: boolean;
  read: boolean;
  createdAt: string;
  summary?: string;
  type?: BookmarkType;
  faviconUrl?: string;
  status: "PENDING" | "PROCESSING" | "READY" | "ERROR";
  metadata?: BookmarkMetadata;
  tags: Array<{
    tag: {
      id: string;
      name: string;
      type: string;
    };
  }>;
}

export interface BookmarksResponse {
  bookmarks: Bookmark[];
  hasMore: boolean;
  nextCursor?: string;
}

export interface Tag {
  id: string;
  name: string;
  type: string;
}

export interface TagsResponse {
  tags: Tag[];
  hasNextPage: boolean;
  nextCursor: string | null;
}
