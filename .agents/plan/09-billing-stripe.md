# Phase 09 — Billing / Stripe

**Goal:** move SaveIt's billing to hand-rolled Convex Stripe actions + a webhook on `convex/http.ts` +
a `subscriptions` table, modeled on `nowstack-saas/convex/stripe`.

> CORRECTED: SaveIt's **server** does NOT use a Better Auth Stripe plugin. Stripe is called via the raw
> Stripe SDK inside Better Auth hooks (`user.create.after` → create customer; `user.deleteUser.beforeDelete`
> → cancel subscriptions) and in TanStack routes that already exist (`api.webhooks.stripe.ts`,
> `api.upgrade.ts`, `api.mobile.checkout.ts`). Only the *mobile client* imports `@better-auth/stripe/client`.
> So this phase **ports manual Stripe logic + existing route handlers**, it does not "remove a BA plugin."

**Current logic to port:** `apps/web/src/lib/stripe.ts`, `auth/stripe/auth-plans.ts`, the user-create
Stripe customer hook + `deleteUser.beforeDelete` cancel hook (`auth-params.ts`), and the existing routes
`api.webhooks.stripe.ts`, `api.upgrade.ts`, `api.mobile.checkout.ts`.

**Depends on:** Phase 02 (auth + custom user field `stripeCustomerId`), 05 (limits read subscriptions).

---

## Model (user-centric)
SaveIt subscribes **users**, not orgs. `subscriptions.userId` = referenceId. `stripeCustomerId` lives on
the betterAuth `user` row (custom field) and/or mirrored on the subscription.

## `packages/backend/convex/stripe/actions.ts` (`"use node"`)
- `ensureCustomer` (internal) — called from `auth/hooks.onUserCreated`; create a Stripe customer, store
  `stripeCustomerId` on the user via `betterAuth/data.patchUser`.
- `createCheckout` (authAction) — port `upgrade.action.ts`: create a Checkout Session for
  `STRIPE_PRO_MONTHLY_PRICE_ID` / `STRIPE_PRO_YEARLY_PRICE_ID`, optional `STRIPE_COUPON_ID`, return URL.
- `createBillingPortal` (authAction) — billing portal session URL.
- `processWebhook` (internalAction) — verify signature with `STRIPE_WEBHOOK_SECRET`; handle
  `checkout.session.completed`, `customer.subscription.updated/deleted`; call
  `internal.subscriptions.mutations.upsertFromWebhook` / `updateFromWebhook`. On first activation,
  schedule the `user/subscription` upgrade drip (Phase 10).
- `createPromotionCode` (internal) — used by the limit-reached marketing drip (Phase 10), port from
  `marketingEmailsOnLimitReachedJob`.

## Webhook route (`convex/http.ts`)
```ts
http.route({ path: "/stripe/webhook", method: "POST", handler: httpAction(async (ctx, req) => {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature") ?? "";
  const res = await ctx.runAction(internal.stripe.actions.processWebhook, { body, signature });
  return new Response(JSON.stringify(res), { status: res.ok ? 200 : 400 });
})});
```
Point the Stripe dashboard webhook at `https://<deployment>.convex.site/stripe/webhook`.

## `packages/backend/convex/subscriptions/{queries,mutations}.ts`
- `queries.getMine` (authQuery) — current user's subscription (or `{ plan: "free" }`).
- `mutations.upsertFromWebhook` / `updateFromWebhook` — **internal only**; write the `subscriptions`
  row by `by_stripe_subscription` / `by_user`.

## Limits integration
`billing/limits.ts` (Phase 05) reads `subscriptions.getMine` → plan → `PLANS[plan]`, merged with
`user.metadata.customLimits`. `subscription.status in ["active","trialing"]` ⇒ `pro`.

## Frontend
- Re-add the upgrade / pricing / billing pages (deleted in the migration) calling
  `useConvexMutation(api.stripe.actions.createCheckout / createBillingPortal)`.
- `VITE_STRIPE_PUBLISHABLE_KEY` stays client-side (Checkout redirect, no Elements needed).

## Acceptance criteria
- New user → Stripe customer created automatically.
- Upgrade → Checkout → webhook flips the user to `pro`; limits update immediately (reactive).
- Cancel → portal → webhook downgrades at period end (`cancelAtPeriodEnd`).
- Limit-reached drip can mint a promo code.

## Risks
- Webhook signature verification needs the **raw** body — use `req.text()`, never parsed JSON.
- Idempotency: webhooks can replay; upsert by `stripeSubscriptionId`.
- Don't leave the old Better Auth Stripe plugin enabled — it would double-handle events.
