import {
  cleanup,
  defineWorkflow,
  start,
  vResultValidator,
  vWorkflowId,
} from "@convex-dev/workflow";
import { v } from "convex/values";
import { components, internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { internalMutation, type MutationCtx } from "../_generated/server";

const RETRY = { maxAttempts: 6, initialBackoffMs: 1000, base: 2 };
const options = {
  retryActionsByDefault: true,
  defaultRetryBehavior: RETRY,
};

export const syncNewUser = defineWorkflow(components.workflow, {
  args: { userId: v.string() },
  workpoolOptions: options,
}).handler(async (step, { userId }): Promise<null> => {
  await step.runAction(
    internal.integrations.lumail.syncNewUser,
    { userId },
    { name: "sync-new-user" },
  );
  return null;
});

export const syncBookmarkLifecycle = defineWorkflow(components.workflow, {
  args: {
    userId: v.string(),
    bookmarkCount: v.number(),
    offerId: v.optional(v.id("marketingLimitOffers")),
  },
  workpoolOptions: options,
}).handler(async (step, { userId, bookmarkCount, offerId }): Promise<null> => {
  let promoCode: string | undefined;
  if (offerId) {
    promoCode = await step.runAction(
      internal.integrations.lumail.createLimitPromoCode,
      { userId, offerId },
      { name: "create-limit-promo" },
    );
    await step.runMutation(
      internal.integrations.state.storeLimitPromoCode,
      { offerId, promoCode },
      { name: "store-limit-promo" },
    );
  }

  await step.runAction(
    internal.integrations.lumail.syncBookmarkLifecycle,
    {
      userId,
      bookmarkCount,
      startLimitOffer: offerId !== undefined,
      ...(promoCode ? { promoCode } : {}),
    },
    { name: "sync-bookmark-lifecycle" },
  );

  if (offerId) {
    await step.runMutation(
      internal.integrations.state.activateLimitOffer,
      { offerId },
      { name: "activate-limit-offer" },
    );
  }
  return null;
});

export const syncPlan = defineWorkflow(components.workflow, {
  args: { userId: v.string() },
  workpoolOptions: options,
}).handler(async (step, { userId }): Promise<null> => {
  await step.runAction(
    internal.integrations.lumail.syncPlan,
    { userId },
    { name: "sync-plan" },
  );
  return null;
});

export const syncProfile = defineWorkflow(components.workflow, {
  args: { userId: v.string(), previousEmail: v.string() },
  workpoolOptions: options,
}).handler(async (step, args): Promise<null> => {
  await step.runAction(internal.integrations.lumail.syncProfile, args, {
    name: "sync-profile",
  });
  return null;
});

export const unsubscribeUser = defineWorkflow(components.workflow, {
  args: { userId: v.string() },
  workpoolOptions: options,
}).handler(async (step, { userId }): Promise<null> => {
  await step.runAction(
    internal.integrations.lumail.unsubscribeUser,
    { userId },
    { name: "unsubscribe-user" },
  );
  return null;
});

export const deleteSubscriber = defineWorkflow(components.workflow, {
  args: { email: v.string() },
  workpoolOptions: options,
}).handler(async (step, { email }): Promise<null> => {
  await step.runAction(
    internal.integrations.lumail.deleteSubscriber,
    { email },
    { name: "delete-subscriber" },
  );
  return null;
});

async function startWithCompletion(
  ctx: MutationCtx,
  workflow: Parameters<typeof start>[1],
  args: Parameters<typeof start>[2],
  kind: string,
): Promise<void> {
  await start(ctx, workflow, args, {
    onComplete: internal.integrations.workflows.onComplete,
    context: { kind },
    startAsync: true,
  });
}

export async function startNewUserSync(
  ctx: MutationCtx,
  args: { userId: string },
): Promise<void> {
  await startWithCompletion(
    ctx,
    internal.integrations.workflows.syncNewUser,
    args,
    "new-user",
  );
}

export async function startBookmarkLifecycleSync(
  ctx: MutationCtx,
  args: {
    userId: string;
    bookmarkCount: number;
    offerId?: Id<"marketingLimitOffers">;
  },
): Promise<void> {
  await startWithCompletion(
    ctx,
    internal.integrations.workflows.syncBookmarkLifecycle,
    args,
    "bookmark-lifecycle",
  );
}

export async function startPlanSync(
  ctx: MutationCtx,
  args: { userId: string },
): Promise<void> {
  await startWithCompletion(
    ctx,
    internal.integrations.workflows.syncPlan,
    args,
    "plan",
  );
}

export async function startProfileSync(
  ctx: MutationCtx,
  args: { userId: string; previousEmail: string },
): Promise<void> {
  await startWithCompletion(
    ctx,
    internal.integrations.workflows.syncProfile,
    args,
    "profile",
  );
}

export async function startUnsubscribeSync(
  ctx: MutationCtx,
  args: { userId: string },
): Promise<void> {
  await startWithCompletion(
    ctx,
    internal.integrations.workflows.unsubscribeUser,
    args,
    "unsubscribe",
  );
}

export async function startDeleteSync(
  ctx: MutationCtx,
  args: { email: string },
): Promise<void> {
  await startWithCompletion(
    ctx,
    internal.integrations.workflows.deleteSubscriber,
    args,
    "delete",
  );
}

export const queueNewUser = internalMutation({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    await startNewUserSync(ctx, args);
    return null;
  },
});

export const queueBookmarkLifecycle = internalMutation({
  args: {
    userId: v.string(),
    bookmarkCount: v.number(),
    offerId: v.optional(v.id("marketingLimitOffers")),
  },
  handler: async (ctx, args) => {
    await startBookmarkLifecycleSync(ctx, args);
    return null;
  },
});

export const queuePlan = internalMutation({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    await startPlanSync(ctx, args);
    return null;
  },
});

export const queueProfile = internalMutation({
  args: { userId: v.string(), previousEmail: v.string() },
  handler: async (ctx, args) => {
    await startProfileSync(ctx, args);
    return null;
  },
});

export const queueUnsubscribe = internalMutation({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    await startUnsubscribeSync(ctx, args);
    return null;
  },
});

export const queueDelete = internalMutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    await startDeleteSync(ctx, args);
    return null;
  },
});

export const onComplete = internalMutation({
  args: {
    workflowId: vWorkflowId,
    result: vResultValidator,
    context: v.object({ kind: v.string() }),
  },
  handler: async (ctx, { workflowId, result, context }) => {
    if (result.kind === "success") {
      await cleanup(ctx, components.workflow, workflowId);
      return null;
    }
    console.error(
      `[marketing-sync] ${context.kind} workflow did not complete`,
      {
        workflowId,
        result: result.kind,
      },
    );
    return null;
  },
});
