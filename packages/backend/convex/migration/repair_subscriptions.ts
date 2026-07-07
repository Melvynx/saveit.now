import { v } from "convex/values";
import { components, internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { action, internalMutation, internalQuery } from "../functions";
import { throwConfigurationError } from "../utils/errors";
import { assertMigrationAllowed } from "./import";

const DEFAULT_PAGE_SIZE = 100;
const MAX_PAGE_SIZE = 100;
const MAX_LIMIT = 500;

const ACTIVE_STATUSES = new Set(["active", "trialing"]);

const subscriptionRepairRow = v.object({
  id: v.id("subscriptions"),
  userId: v.string(),
  status: v.union(v.string(), v.null()),
  stripeCustomerId: v.union(v.string(), v.null()),
  stripeSubscriptionId: v.string(),
});

const pageSubscriptionsResult = v.object({
  rows: v.array(subscriptionRepairRow),
  continueCursor: v.union(v.string(), v.null()),
  isDone: v.boolean(),
  scanned: v.number(),
});

const patchRepairResult = v.object({
  subscriptionUpdated: v.boolean(),
  userUpdated: v.boolean(),
});

type SubscriptionRepairRow = {
  id: Id<"subscriptions">;
  userId: string;
  status: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string;
};

type PageSubscriptionsResult = {
  rows: SubscriptionRepairRow[];
  continueCursor: string | null;
  isDone: boolean;
  scanned: number;
};

type PatchRepairResult = {
  subscriptionUpdated: boolean;
  userUpdated: boolean;
};

type StripeSubscriptionLive = {
  status: string;
  customerId: string | null;
};

type StripeFetchResult =
  | { kind: "found"; subscription: StripeSubscriptionLive }
  | { kind: "missing"; message: string }
  | { kind: "error"; message: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getStripeSecretKey(): string {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throwConfigurationError("STRIPE_SECRET_KEY is not set");
  return key;
}

function normalizeLimit(limit: number | undefined): number | null {
  if (limit === undefined) return null;
  if (!Number.isFinite(limit)) return MAX_LIMIT;
  return Math.min(MAX_LIMIT, Math.max(1, Math.trunc(limit)));
}

function getStripeErrorMessage(body: unknown, fallback: string): string {
  if (!isRecord(body)) return fallback;
  const error = body.error;
  if (isRecord(error) && typeof error.message === "string") {
    return error.message;
  }
  return fallback;
}

function getStripeCustomerId(customer: unknown): string | null {
  if (typeof customer === "string") return customer;
  if (isRecord(customer) && typeof customer.id === "string") {
    return customer.id;
  }
  return null;
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

async function fetchStripeSubscription(
  stripeSubscriptionId: string,
  stripeSecretKey: string,
): Promise<StripeFetchResult> {
  const response = await fetch(
    `https://api.stripe.com/v1/subscriptions/${encodeURIComponent(
      stripeSubscriptionId,
    )}`,
    {
      headers: {
        Authorization: `Bearer ${stripeSecretKey}`,
      },
    },
  );

  const body = await readJson(response);

  if (response.status === 404) {
    return {
      kind: "missing",
      message: getStripeErrorMessage(body, "Subscription not found in Stripe"),
    };
  }

  if (!response.ok) {
    return {
      kind: "error",
      message: getStripeErrorMessage(
        body,
        `Stripe request failed with status ${response.status}`,
      ),
    };
  }

  if (!isRecord(body) || typeof body.status !== "string") {
    return {
      kind: "error",
      message: "Stripe subscription response did not include a status",
    };
  }

  return {
    kind: "found",
    subscription: {
      status: body.status,
      customerId: getStripeCustomerId(body.customer),
    },
  };
}

export const pageSubscriptionsWithStripeId = internalQuery({
  args: {
    cursor: v.union(v.string(), v.null()),
    limit: v.number(),
  },
  returns: pageSubscriptionsResult,
  handler: async (ctx, { cursor, limit }) => {
    const pageSize = Math.min(
      MAX_PAGE_SIZE,
      Math.max(
        1,
        Math.trunc(Number.isFinite(limit) ? limit : DEFAULT_PAGE_SIZE),
      ),
    );

    const result = await ctx.db
      .query("subscriptions")
      .withIndex("by_stripe_subscription", (q) =>
        q.gt("stripeSubscriptionId", ""),
      )
      .paginate({ cursor, numItems: pageSize });

    return {
      rows: result.page.flatMap((row) => {
        if (!row.stripeSubscriptionId) return [];
        return [
          {
            id: row._id,
            userId: row.userId,
            status: row.status ?? null,
            stripeCustomerId: row.stripeCustomerId ?? null,
            stripeSubscriptionId: row.stripeSubscriptionId,
          },
        ];
      }),
      continueCursor: result.isDone ? null : result.continueCursor,
      isDone: result.isDone,
      scanned: result.page.length,
    };
  },
});

export const applySubscriptionRepair = internalMutation({
  args: {
    subscriptionId: v.id("subscriptions"),
    desiredStatus: v.string(),
    desiredStripeCustomerId: v.union(v.string(), v.null()),
    patchUserStripeCustomerId: v.boolean(),
    userId: v.string(),
  },
  returns: patchRepairResult,
  handler: async (ctx, args) => {
    const subscription = await ctx.db.get(args.subscriptionId);
    if (!subscription) {
      return { subscriptionUpdated: false, userUpdated: false };
    }

    const subscriptionPatch: {
      status?: string;
      stripeCustomerId?: string;
      updatedAt?: number;
    } = {};

    if (subscription.status !== args.desiredStatus) {
      subscriptionPatch.status = args.desiredStatus;
    }

    if (
      args.desiredStripeCustomerId !== null &&
      subscription.stripeCustomerId !== args.desiredStripeCustomerId
    ) {
      subscriptionPatch.stripeCustomerId = args.desiredStripeCustomerId;
    }

    if (Object.keys(subscriptionPatch).length > 0) {
      subscriptionPatch.updatedAt = Date.now();
      await ctx.db.patch(args.subscriptionId, subscriptionPatch);
    }

    let userUpdated = false;
    if (
      args.patchUserStripeCustomerId &&
      args.desiredStripeCustomerId !== null
    ) {
      const patchedUser = await ctx.runMutation(
        components.betterAuth.data.patchUser,
        {
          userId: args.userId,
          update: { stripeCustomerId: args.desiredStripeCustomerId },
        },
      );
      userUpdated = patchedUser !== null;
    }

    return {
      subscriptionUpdated: Object.keys(subscriptionPatch).length > 0,
      userUpdated,
    };
  },
});

export const repairSubscriptions = action({
  args: {
    migrationSecret: v.string(),
    dryRun: v.optional(v.boolean()),
    limit: v.optional(v.number()),
  },
  returns: v.object({
    dryRun: v.boolean(),
    limit: v.union(v.number(), v.null()),
    checked: v.number(),
    scanned: v.number(),
    updated: v.number(),
    userRecordsUpdated: v.number(),
    missingOnStripe: v.number(),
    errors: v.number(),
    errorDetails: v.array(
      v.object({
        stripeSubscriptionId: v.string(),
        message: v.string(),
      }),
    ),
  }),
  handler: async (ctx, args) => {
    assertMigrationAllowed(args.migrationSecret);

    const dryRun = args.dryRun ?? false;
    const limit = normalizeLimit(args.limit);
    const stripeSecretKey = getStripeSecretKey();

    let cursor: string | null = null;
    let isDone = false;
    let checked = 0;
    let scanned = 0;
    let updated = 0;
    let userRecordsUpdated = 0;
    let missingOnStripe = 0;
    let errors = 0;
    const errorDetails: { stripeSubscriptionId: string; message: string }[] =
      [];

    while (!isDone && (limit === null || checked < limit)) {
      const remaining = limit === null ? DEFAULT_PAGE_SIZE : limit - checked;
      const pageSize = Math.min(DEFAULT_PAGE_SIZE, Math.max(1, remaining));

      const page: PageSubscriptionsResult = await ctx.runQuery(
        internal.migration.repair_subscriptions.pageSubscriptionsWithStripeId,
        { cursor, limit: pageSize },
      );

      scanned += page.scanned;
      cursor = page.continueCursor;
      isDone = page.isDone;

      for (const row of page.rows) {
        if (limit !== null && checked >= limit) break;
        checked += 1;

        const live = await fetchStripeSubscription(
          row.stripeSubscriptionId,
          stripeSecretKey,
        );

        if (live.kind === "missing") {
          missingOnStripe += 1;
          console.warn(
            "[repairSubscriptions] missing on Stripe",
            row.stripeSubscriptionId,
            live.message,
          );
          continue;
        }

        if (live.kind === "error") {
          errors += 1;
          errorDetails.push({
            stripeSubscriptionId: row.stripeSubscriptionId,
            message: live.message,
          });
          console.warn(
            "[repairSubscriptions] Stripe fetch error",
            row.stripeSubscriptionId,
            live.message,
          );
          continue;
        }

        const liveStatus = live.subscription.status;
        const liveCustomerId = live.subscription.customerId;
        const subscriptionNeedsPatch =
          row.status !== liveStatus ||
          (liveCustomerId !== null && row.stripeCustomerId !== liveCustomerId);

        let patchUserStripeCustomerId = false;
        if (ACTIVE_STATUSES.has(liveStatus) && liveCustomerId !== null) {
          const user = await ctx.runQuery(
            components.betterAuth.data.getUserById,
            {
              userId: row.userId,
            },
          );
          patchUserStripeCustomerId =
            user !== null && user.stripeCustomerId !== liveCustomerId;

          if (patchUserStripeCustomerId) {
            console.log(
              "[repairSubscriptions] user stripeCustomerId mismatch",
              {
                userId: row.userId,
                from: user.stripeCustomerId ?? null,
                to: liveCustomerId,
                stripeSubscriptionId: row.stripeSubscriptionId,
              },
            );
          }
        }

        if (!subscriptionNeedsPatch && !patchUserStripeCustomerId) continue;

        console.log("[repairSubscriptions] subscription repair", {
          dryRun,
          subscriptionId: row.id,
          stripeSubscriptionId: row.stripeSubscriptionId,
          statusFrom: row.status,
          statusTo: liveStatus,
          stripeCustomerIdFrom: row.stripeCustomerId,
          stripeCustomerIdTo: liveCustomerId,
          patchUserStripeCustomerId,
        });

        if (dryRun) {
          if (subscriptionNeedsPatch) updated += 1;
          if (patchUserStripeCustomerId) userRecordsUpdated += 1;
          continue;
        }

        const patchResult: PatchRepairResult = await ctx.runMutation(
          internal.migration.repair_subscriptions.applySubscriptionRepair,
          {
            subscriptionId: row.id,
            desiredStatus: liveStatus,
            desiredStripeCustomerId: liveCustomerId,
            patchUserStripeCustomerId,
            userId: row.userId,
          },
        );

        if (patchResult.subscriptionUpdated) updated += 1;
        if (patchResult.userUpdated) userRecordsUpdated += 1;
      }

      if (cursor === null) break;
    }

    return {
      dryRun,
      limit,
      checked,
      scanned,
      updated,
      userRecordsUpdated,
      missingOnStripe,
      errors,
      errorDetails,
    };
  },
});
