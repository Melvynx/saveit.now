/**
 * Shared types for the admin panel, matching the Convex-returned shapes
 * from api.admin.queries.*.
 */

export type AdminUserListItem = {
  id: string;
  name: string | null;
  email: string | null;
  role: string | null;
  banned: boolean | null;
  banReason: string | null;
  emailVerified: boolean;
  createdAt: number;
  publicLinkEnabled: boolean;
  subscriptions: Array<{
    plan: string;
    status: string | null;
    periodEnd: number | null;
  }>;
  _count: {
    bookmarks: number;
    bookmarkOpens: number;
  };
};
