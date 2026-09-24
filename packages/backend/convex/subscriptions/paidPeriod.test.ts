// @vitest-environment edge-runtime
import workflow from "@convex-dev/workflow/test";
import { convexTest } from "convex-test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { internal } from "../_generated/api";
import { deriveEffectivePlan } from "../billing/plans";
import { startPlanSync } from "../integrations/workflows";
import schema from "../schema";

// convex-test cannot start durable workflows (no getFunctionMetadata syscall).
vi.mock("../integrations/workflows", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../integrations/workflows")>()),
  startPlanSync: vi.fn(async () => {}),
}));

// Root-relative: Vite keys same-directory matches as `./…`, which convex-test
// cannot map back to `subscriptions/…` function paths.
const modules = import.meta.glob("/convex/**/*.*s");

const NOW = Date.parse("2026-09-24T00:00:00Z");
const PERIOD_START = Date.parse("2026-08-27T13:57:40Z");
const PERIOD_END = Date.parse("2027-08-27T13:57:40Z");
const SUB_ID = "sub_paid_after_cancel";

const paidPeriodState = {
  stripeSubscriptionId: SUB_ID,
  plan: "pro" as const,
  status: "canceled",
  periodStart: PERIOD_START,
  periodEnd: PERIOD_END,
  cancelAtPeriodEnd: true,
};

function setup(row: { plan: string; status: string }) {
  const t = convexTest(schema, modules);
  workflow.register(t);
  const insert = () =>
    t.run((ctx) =>
      ctx.db.insert("subscriptions", {
        userId: "user_1",
        provider: "stripe",
        stripeSubscriptionId: SUB_ID,
        periodStart: PERIOD_START,
        periodEnd: PERIOD_END,
        cancelAtPeriodEnd: false,
        createdAt: NOW,
        updatedAt: NOW,
        ...row,
      }),
    );
  const scheduled = (name: string) =>
    t.run(async (ctx) =>
      (await ctx.db.system.query("_scheduled_functions").collect()).filter(
        (job) => job.name.includes(name),
      ),
    );
  return { t, insert, scheduled };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  vi.mocked(startPlanSync).mockClear();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("paid Stripe period after cancellation", () => {
  it("keeps Pro and schedules one guarded expiry at the period end", async () => {
    const { t, insert, scheduled } = setup({ plan: "pro", status: "active" });
    const id = await insert();

    await t.mutation(
      internal.subscriptions.mutations.updateFromWebhook,
      paidPeriodState,
    );
    await t.mutation(
      internal.subscriptions.mutations.updateFromWebhook,
      paidPeriodState,
    );

    const row = await t.run((ctx) => ctx.db.get(id));
    expect(row).toMatchObject({ plan: "pro", status: "canceled" });
    expect(deriveEffectivePlan(row)).toBe("pro");

    const expiries = await scheduled("expirePaidStripePeriod");
    expect(expiries).toHaveLength(1);
    expect(expiries[0]!.scheduledTime).toBe(PERIOD_END);
    expect(await scheduled("retryLimitExceededBookmarks")).toHaveLength(0);
  });

  it("does nothing before the paid period ends", async () => {
    const { t, insert } = setup({ plan: "pro", status: "canceled" });
    const id = await insert();

    await t.mutation(internal.subscriptions.mutations.expirePaidStripePeriod, {
      subscriptionId: id,
    });

    expect(await t.run((ctx) => ctx.db.get(id))).toMatchObject({
      plan: "pro",
    });
    expect(startPlanSync).not.toHaveBeenCalled();
  });

  it("stores Free once the paid period is over", async () => {
    const { t, insert } = setup({ plan: "pro", status: "canceled" });
    const id = await insert();
    vi.setSystemTime(PERIOD_END);

    await t.mutation(internal.subscriptions.mutations.expirePaidStripePeriod, {
      subscriptionId: id,
    });

    const row = await t.run((ctx) => ctx.db.get(id));
    expect(row).toMatchObject({ plan: "free", cancelAtPeriodEnd: false });
    expect(deriveEffectivePlan(row)).toBe("free");
    expect(startPlanSync).toHaveBeenCalledWith(expect.anything(), {
      userId: "user_1",
    });
  });

  it("leaves a resubscribed row alone", async () => {
    const { t, insert } = setup({ plan: "pro", status: "active" });
    const id = await insert();
    vi.setSystemTime(PERIOD_END);

    await t.mutation(internal.subscriptions.mutations.expirePaidStripePeriod, {
      subscriptionId: id,
    });

    expect(await t.run((ctx) => ctx.db.get(id))).toMatchObject({
      plan: "pro",
      status: "active",
    });
  });

  it("retries limited bookmarks once when a late payment restores Pro", async () => {
    const { t, insert, scheduled } = setup({
      plan: "free",
      status: "canceled",
    });
    await insert();

    await t.mutation(
      internal.subscriptions.mutations.updateFromWebhook,
      paidPeriodState,
    );
    await t.mutation(
      internal.subscriptions.mutations.updateFromWebhook,
      paidPeriodState,
    );

    expect(await scheduled("retryLimitExceededBookmarks")).toHaveLength(1);
  });
});
