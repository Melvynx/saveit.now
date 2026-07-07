/**
 * admin/actions.ts — Admin-only action endpoints.
 * Default runtime (no "use node" needed — no Node-only APIs used).
 *
 * All exports use the `adminAction` builder which enforces `user.role === "admin"`
 * server-side via `requireAdmin`.
 */

import { v } from "convex/values";
import { internal } from "../_generated/api";
import { adminAction } from "../functions";

// ---------------------------------------------------------------------------
// Broadcast email
// ---------------------------------------------------------------------------

/**
 * sendBroadcastEmail — triggers a batch marketing email to all eligible users.
 * Delegates to `internal.marketing.maintenance.sendBatchEmail` which handles
 * pagination, batching, and per-user unsubscribe links.
 *
 * Contract §B: api.admin.actions.sendBroadcastEmail
 */
export const sendBroadcastEmail = adminAction({
  args: {
    subject: v.string(),
    subheadline: v.string(),
    markdown: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.runAction(internal.marketing.maintenance.sendBatchEmail, {
      subject: args.subject,
      subheadline: args.subheadline,
      markdown: args.markdown,
    });

    return { success: true };
  },
});
