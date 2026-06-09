import { v } from "convex/values";
import { components, internal } from "../_generated/api";
import { internalAction } from "../_generated/server";

const BATCH_SIZE = 100;
const MAX_AUTH_FETCH = 500; // betterAuth listUsersForAdmin max

/**
 * Admin-triggered batch marketing email.
 * Fetches eligible users (unsubscribed !== true, non-null email) from the
 * betterAuth component in pages of BATCH_SIZE, sends in parallel per batch,
 * adds 1-second inter-batch delay.
 *
 * NOTE: Re-check of unsubscribed per-user is intentionally NOT done here —
 * the eligibility query at the start is the sole gate (Spec 08 §2.4).
 * A user who unsubscribes after the query but before their batch is processed
 * may still receive the email. This matches the Inngest original behaviour.
 *
 * Contract §B: internal.marketing.maintenance.sendBatchEmail
 */
export const sendBatchEmail = internalAction({
  args: {
    subject: v.string(),
    subheadline: v.string(),
    markdown: v.string(),
  },
  handler: async (ctx, args) => {
    const siteUrl = process.env.SITE_URL ?? "https://saveit.now";
    let totalRecipients = 0;
    let batchNumber = 0;

    // Paginate betterAuth users using cursor-style createdAt boundary.
    // listUsersForAdmin supports up to MAX_AUTH_ROWS (500) per call, ascending.
    let cursorCreatedAt = 0;
    let hasMore = true;

    while (hasMore) {
      // Fetch a bounded chunk from betterAuth.
      const allUsersChunk = await ctx.runQuery(
        components.betterAuth.data.listUsersForAdmin,
        {
          limit: MAX_AUTH_FETCH,
          sort: "asc",
        },
      );

      // Apply cursor filter (skip users we've already processed).
      const afterCursor =
        cursorCreatedAt > 0
          ? allUsersChunk.filter((u: any) => u.createdAt > cursorCreatedAt)
          : allUsersChunk;

      // Filter eligible: non-null email AND unsubscribed !== true.
      const eligible = afterCursor.filter(
        (u: any) => u.email && u.unsubscribed !== true,
      );

      if (eligible.length === 0) {
        hasMore = false;
        break;
      }

      // Process in batches of BATCH_SIZE.
      for (let i = 0; i < eligible.length; i += BATCH_SIZE) {
        const batch = eligible.slice(i, i + BATCH_SIZE);
        batchNumber++;

        // Send to all users in this batch in parallel.
        await Promise.all(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          batch.map(async (user: any) => {
            const markdownWithUnsubscribe =
              args.markdown +
              `\n\n---\n\n[Unsubscribe from marketing emails](${siteUrl}/unsubscribe/${user._id})`;

            try {
              await ctx.runAction(internal.email.actions.sendMarkdownEmail, {
                to: user.email!,
                subject: args.subject,
                markdown: markdownWithUnsubscribe,
                preview: args.subheadline,
                from: "Melvyn from SaveIt.now <help@re.saveit.now>",
                disabledSignature: false,
              });
            } catch (error) {
              console.error(
                "[marketing.maintenance.sendBatchEmail] failed to send to",
                user.email,
                error,
              );
            }
          }),
        );

        totalRecipients += batch.length;

        // 1-second delay between batches (except after the last one).
        if (i + BATCH_SIZE < eligible.length) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }

      // Check if there are more users beyond this chunk.
      if (afterCursor.length < MAX_AUTH_FETCH) {
        // Fetched fewer than max — no more pages.
        hasMore = false;
      } else {
        // Advance cursor to last user's createdAt.
        const lastUser = afterCursor[afterCursor.length - 1];
        if (lastUser.createdAt <= cursorCreatedAt) {
          // Guard against infinite loop.
          hasMore = false;
        } else {
          cursorCreatedAt = lastUser.createdAt;
        }
      }
    }

    console.log("[marketing.maintenance.sendBatchEmail] done", {
      subject: args.subject,
      totalRecipients,
      totalBatches: batchNumber,
    });

    return null;
  },
});
