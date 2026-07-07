import {
  customAction,
  customCtx,
  customMutation,
  customQuery,
} from "convex-helpers/server/customFunctions";
import { action, mutation, query } from "./_generated/server";
import { requireAdmin, requireAuth } from "./auth/config";

/**
 * User-centric function builders. The authenticated user (the betterAuth user
 * row, with SaveIt custom fields) is resolved server-side via `requireAuth`.
 * NEVER trust a client-passed `userId`; always read `ctx.user.id`.
 */
export const authQuery = customQuery(
  query,
  customCtx(async (ctx) => {
    const { user } = await requireAuth(ctx);
    return { user };
  }),
);

export const authMutation = customMutation(
  mutation,
  customCtx(async (ctx) => {
    const { user } = await requireAuth(ctx);
    return { user };
  }),
);

export const authAction = customAction(
  action,
  customCtx(async (ctx) => {
    const { user } = await requireAuth(ctx);
    return { user };
  }),
);

export const adminQuery = customQuery(
  query,
  customCtx(async (ctx) => {
    const { user } = await requireAdmin(ctx);
    return { user };
  }),
);

export const adminMutation = customMutation(
  mutation,
  customCtx(async (ctx) => {
    const { user } = await requireAdmin(ctx);
    return { user };
  }),
);

export const adminAction = customAction(
  action,
  customCtx(async (ctx) => {
    const { user } = await requireAdmin(ctx);
    return { user };
  }),
);

export { query, mutation, action } from "./_generated/server";
export {
  internalQuery,
  internalMutation,
  internalAction,
} from "./_generated/server";
