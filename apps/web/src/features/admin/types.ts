/**
 * Admin panel types, derived from the Convex return types so the UI can never
 * drift from `packages/backend/convex/admin/queries.ts`.
 */

import type { api } from "@convex/_generated/api";
import type { FunctionReturnType } from "convex/server";

export type AdminOverview = FunctionReturnType<
  typeof api.admin.queries.getOverview
>;

export type AdminUsersResult = FunctionReturnType<
  typeof api.admin.queries.listUsers
>;

export type AdminUserListItem = AdminUsersResult["users"][number];

export type AdminUserDetail = NonNullable<
  FunctionReturnType<typeof api.admin.queries.getUserDetail>
>;

export type AdminActivityEvent = FunctionReturnType<
  typeof api.admin.queries.getRecentActivity
>[number];

export type AdminTopUser = FunctionReturnType<
  typeof api.admin.queries.getTopUsers
>[number];
