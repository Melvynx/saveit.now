import { BookmarkType } from "@/lib/bookmark-types";
import {
  CirclePlay,
  CircleDot,
  FileText,
  Globe,
  Image,
  Library,
  type LucideIcon,
  MessageSquareQuote,
  Newspaper,
  ShoppingBag,
  Sparkles,
  Star,
} from "lucide-react";

/** URL search params the library reads (see features/app/use-bookmarks.ts). */
export type LibrarySearch = {
  query?: string;
  types?: string;
  tags?: string;
  special?: string;
};

export type SidebarCountKey = "unread" | "starred";

export type SidebarNavItem = {
  id: string;
  label: string;
  icon: LucideIcon;
  to: "/app" | "/app/agents";
  search?: LibrarySearch;
  countKey?: SidebarCountKey;
  isActive: (pathname: string, search: LibrarySearch) => boolean;
};

const isLibraryPath = (pathname: string) => pathname === "/app";

const hasNoFilters = (search: LibrarySearch) =>
  !search.special && !search.types && !search.tags;

export const PRIMARY_NAV: SidebarNavItem[] = [
  {
    id: "library",
    label: "Library",
    icon: Library,
    to: "/app",
    isActive: (pathname, search) =>
      isLibraryPath(pathname) && hasNoFilters(search),
  },
  {
    id: "unread",
    label: "Unread",
    icon: CircleDot,
    to: "/app",
    search: { special: "UNREAD" },
    countKey: "unread",
    isActive: (pathname, search) =>
      isLibraryPath(pathname) && search.special === "UNREAD",
  },
  {
    id: "starred",
    label: "Starred",
    icon: Star,
    to: "/app",
    search: { special: "STAR" },
    countKey: "starred",
    isActive: (pathname, search) =>
      isLibraryPath(pathname) && search.special === "STAR",
  },
  {
    id: "ask-ai",
    label: "Ask AI",
    icon: Sparkles,
    to: "/app/agents",
    isActive: (pathname) => pathname.startsWith("/app/agents"),
  },
];

const typeItem = (
  type: BookmarkType,
  label: string,
  icon: LucideIcon,
): SidebarNavItem => ({
  id: `type-${type.toLowerCase()}`,
  label,
  icon,
  to: "/app",
  search: { types: type },
  isActive: (pathname, search) =>
    isLibraryPath(pathname) && search.types === type,
});

export const TYPE_NAV: SidebarNavItem[] = [
  typeItem(BookmarkType.ARTICLE, "Articles", Newspaper),
  typeItem(BookmarkType.PAGE, "Pages", Globe),
  typeItem(BookmarkType.YOUTUBE, "Videos", CirclePlay),
  typeItem(BookmarkType.TWEET, "Tweets", MessageSquareQuote),
  typeItem(BookmarkType.IMAGE, "Images", Image),
  typeItem(BookmarkType.PDF, "PDFs", FileText),
  typeItem(BookmarkType.PRODUCT, "Products", ShoppingBag),
];

export const SIDEBAR_TAG_LIMIT = 8;
