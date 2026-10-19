import { useAuthedQuery } from "@/hooks/use-authed-query";
import { api } from "@convex/_generated/api";

export type SidebarCounts = {
  unread: number;
  starred: number;
  /** True when a count hit the backend cap (100); render "99+". */
  capped: boolean;
};

/** Unread / starred counts for the sidebar nav; undefined while loading. */
export function useSidebarCounts(): SidebarCounts | undefined {
  return useAuthedQuery(api.bookmarks.queries.sidebarCounts, {});
}

export function formatSidebarCount(value: number, capped: boolean) {
  if (value <= 0) return null;
  if (value > 99 || (capped && value >= 99)) return "99+";
  return String(value);
}
