import type { Id } from "../_generated/dataModel";

type LimitOfferMutationCtx = {
  db: {
    query: (table: "marketingLimitOffers") => any;
    insert: (
      table: "marketingLimitOffers",
      value: {
        userId: string;
        status: "pending";
        createdAt: number;
        updatedAt: number;
      },
    ) => Promise<Id<"marketingLimitOffers">>;
  };
};

export async function reserveLimitOffer(
  ctx: LimitOfferMutationCtx,
  userId: string,
): Promise<Id<"marketingLimitOffers"> | null> {
  const existing = await ctx.db
    .query("marketingLimitOffers")
    .withIndex("by_user", (query: any) => query.eq("userId", userId))
    .first();
  if (existing) return null;

  const now = Date.now();
  return await ctx.db.insert("marketingLimitOffers", {
    userId,
    status: "pending",
    createdAt: now,
    updatedAt: now,
  });
}
