# Spec 07 — Billing / Stripe (Phase 09)

This document is a complete porting specification for an implementation engineer.
It covers every current source file, the exact business logic that must be preserved,
external API shapes, the derived Convex target layout, and known gotchas.
Do NOT implement Convex code here — analysis only.

---

## 1. Current file inventory

| File | Responsibility |
|------|----------------|
| `apps/web/src/lib/stripe.ts` | Single Stripe SDK client, `apiVersion: "2025-02-24.acacia"` |
| `apps/web/src/lib/auth-limits.ts` | `AUTH_LIMITS` constants, `getAuthLimits()`, `parseCustomAuthLimits()`, `AUTH_LIMIT_KEYS` |
| `apps/web/src/lib/auth/stripe/auth-plans.ts` | `AUTH_PLANS` array, `getPlanByName()`, `getPlanByPriceId()`; subscription lifecycle hooks |
| `apps/web/src/lib/auth.ts` | `betterAuth` setup; `databaseHooks.user.create.after` → creates Stripe customer + stores `stripeCustomerId` |
| `apps/web/src/lib/auth-params.ts` | `deleteUser.beforeDelete` → cancels Stripe subscriptions; `deleteUser.afterDelete` → sends farewell email |
| `apps/web/src/lib/auth-session.ts` | `getUserLimits()` / `getLimitsForUser()` — reads subscription + metadata, calls `getAuthLimits()` |
| `apps/web/src/features/upgrade/upgrade-api.ts` | `createUpgradeCheckoutSession()` — creates Stripe Checkout Session |
| `apps/web/src/routes/api.upgrade.ts` | POST `/api/upgrade` — authenticates user, calls `createUpgradeCheckoutSession`, returns `{ url }` |
| `apps/web/src/routes/api.mobile.checkout.ts` | POST `/api/mobile/checkout` — same as upgrade but simplified (no plan lookup, just annual flag) |
| `apps/web/src/routes/api.webhooks.stripe.ts` | POST `/api/webhooks/stripe` — Stripe event handler for `checkout.session.completed`, `customer.subscription.updated/deleted` |
| `apps/web/src/routes/billing.tsx` | GET `/billing` — creates Billing Portal session, redirects; falls back to error UI |
| `apps/web/src/routes/upgrade.tsx` | Renders `UpgradePage` component |
| `apps/web/src/routes/upgrade.new-pricing.tsx` | Renders `PricingSection` component (alternate pricing UI) |
| `apps/web/src/routes/upgrade.success.tsx` | Post-checkout success page with confetti + Tella video |
| `apps/web/src/features/upgrade/upgrade-page.tsx` | Main upgrade UI — calls POST `/api/upgrade`, redirects to Stripe |
| `apps/web/src/features/upgrade/pricing-section.tsx` | Alternative pricing UI — also calls POST `/api/upgrade` |
| `apps/web/src/features/upgrade/confetti.tsx` | Client-only confetti animation on success page |
| `apps/web/src/lib/auth/user-plan.ts` | Zustand store `useUserPlan` — client-side cached plan + limits; `InjectUserPlan` hydrates it |
| `apps/web/src/lib/database/user-metadata.utils.ts` | `getUserMetadata()`, `updateUserMetadata()`, `setLimitEmailSent()`, `hasLimitEmailBeenSent()` — JSON `metadata` column helpers |
| `apps/web/src/lib/database/bookmark-validation.ts` | `validateBookmarkLimits()` — checks total bookmarks + monthly runs, triggers limit-reached marketing email |
| `apps/web/src/lib/chat/check-chat-limits.ts` | `getChatUsage()`, `checkChatLimit()`, `checkAndIncrementChatUsage()` — monthly chat query limit enforcement |
| `apps/web/src/lib/auth/api-key-auth.ts` | `validateApiKey()` — validates API key then checks `limits.apiAccess === 0` to block free-tier |
| `apps/web/src/routes/api.user.limits.ts` | GET `/api/user/limits` — returns `{ plan, limits, customLimits, subscription }` |
| `apps/web/src/routes/api.exports.ts` | POST `/api/exports` — checks `limits.canExport === 0` before generating CSV |
| `apps/web/src/lib/inngest/user-limits-check.ts` | `isUserOverLimits()` — checks total bookmarks + monthly processing runs for job gate |
| `apps/web/src/lib/inngest/marketing/marketing-emails-on-limit-reached.job.ts` | Limit-reached drip: mints a Stripe promotion code via `STRIPE_COUPON_ID`, sends 3 discount emails |
| `apps/web/src/lib/inngest/marketing/marketing-emails-on-subscription.job.ts` | Subscription drip: sends 4 emails over 3 days when user upgrades |
| `apps/web/src/lib/env.ts` | Zod-validated env schema — `STRIPE_COUPON_ID` is the only Stripe var handled here (others via `process.env` directly) |

---

## 2. PLANS constants (VERBATIM — must be preserved exactly)

### `AUTH_LIMITS` from `apps/web/src/lib/auth-limits.ts`

```typescript
export type AuthLimits = {
  bookmarks: number;
  monthlyBookmarkRuns: number;
  monthlyChatQueries: number;
  canExport: number;
  apiAccess: number;
};

export const AUTH_LIMIT_KEYS = [
  "bookmarks",
  "monthlyBookmarkRuns",
  "monthlyChatQueries",
  "canExport",
  "apiAccess",
] as const satisfies readonly (keyof AuthLimits)[];

export const AUTH_LIMITS: Record<"pro" | "free", AuthLimits> = {
  free: {
    bookmarks: 20,
    monthlyBookmarkRuns: 20,
    monthlyChatQueries: 10,
    canExport: 0,
    apiAccess: 0,
  },
  pro: {
    bookmarks: 50000,
    monthlyBookmarkRuns: 1500,
    monthlyChatQueries: 200,
    canExport: 1,
    apiAccess: 1,
  },
};
```

**Key semantics:**
- `canExport` and `apiAccess` are **numeric flags** treated as booleans (`=== 0` → denied, `!== 0` → allowed). Not a count.
- `bookmarks` is a hard cap on total saved bookmarks (not per-period).
- `monthlyBookmarkRuns` is a per-calendar-month cap on `bookmarkProcessingRun` records.
- `monthlyChatQueries` is a per-calendar-month cap on `chatUsage` records.

### Custom limits override (from user `metadata`)

The `metadata` JSON column on the `user` row can contain:
```json
{
  "customLimits": {
    "bookmarks": 100,
    "monthlyBookmarkRuns": 50,
    "monthlyChatQueries": 30,
    "canExport": 1,
    "apiAccess": 1
  },
  "limitEmailSentAt": "2024-01-01T00:00:00.000Z"
}
```

**Parsing rules** (`parseCustomAuthLimits`):
- Reads `metadata.customLimits`; if absent or non-object → returns `{}`.
- For each key in `AUTH_LIMIT_KEYS`: value must be `typeof "number"`, `Number.isFinite`, `Number.isInteger`, and `>= 0`. Non-conforming values are silently dropped.
- Returns `Partial<AuthLimits>`.

**Merge** (`getAuthLimits`):
```typescript
const planLimits = AUTH_LIMITS[subscription?.plan] ?? AUTH_LIMITS.free;
return { ...planLimits, ...parseCustomAuthLimits(metadata) };
```
Custom limits **always override** plan limits. This is the admin-configurable per-user override path.

### Plan derivation

A user is **pro** if and only if:
```
subscription.status IN ("active", "trialing")
```
Plan name is taken from `subscription.plan` (the string `"pro"` or `"free"`).
If no subscription row exists → `"free"`.

---

## 3. AUTH_PLANS array (from `auth-plans.ts`)

```typescript
export const AUTH_PLANS: AppAuthPlan[] = [
  {
    name: "free",
    limits: AUTH_LIMITS.free,
  },
  {
    name: "pro",
    priceId: process.env.STRIPE_PRO_MONTHLY_PRICE_ID,
    annualDiscountPriceId: process.env.STRIPE_PRO_YEARLY_PRICE_ID,
    limits: AUTH_LIMITS.pro,
    onSubscriptionComplete: async (subscription, ctx) => {
      // fires inngest "user/subscription" event → subscription drip sequence
    },
  },
];
```

**Important:** `onSubscriptionComplete` triggers the subscription email drip (Phase 10).
In Convex, this maps to `ctx.scheduler.runAfter(0, internal.marketing.actions.sendSubscriptionDrip, { userId })` after the webhook writes the subscription row.

There is no `onSubscriptionCanceled` on the `pro` plan (callback defined but unused on free; only checked in the `customerSubscriptionDeleted` handler which calls it if defined).

---

## 4. External API calls

### 4.1 Stripe SDK

**Client initialization:**
```typescript
new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2025-02-24.acacia" })
```

**Env vars (all server-side on Convex):**
| Variable | Used for |
|----------|----------|
| `STRIPE_SECRET_KEY` | Stripe SDK authentication |
| `STRIPE_WEBHOOK_SECRET` | Signature verification in webhook handler |
| `STRIPE_PRO_MONTHLY_PRICE_ID` | Monthly subscription price |
| `STRIPE_PRO_YEARLY_PRICE_ID` | Annual subscription price (displayed as "−49%") |
| `STRIPE_COUPON_ID` | Base coupon for limit-reached promo codes |

### 4.2 Stripe Checkout Session creation

Two paths exist today (web vs mobile); both produce equivalent sessions:

**Web path** (`createUpgradeCheckoutSession` in `upgrade-api.ts`):
```typescript
stripeClient.checkout.sessions.create({
  customer: dbUser.stripeCustomerId,       // required; user must already have stripeCustomerId
  payment_method_types: ["card"],
  line_items: [{ price: priceId, quantity: 1 }],
  mode: "subscription",
  success_url: `${getServerUrl()}${params.successUrl}?session_id={CHECKOUT_SESSION_ID}`,
  cancel_url: `${getServerUrl()}${params.cancelUrl}`,
  allow_promotion_codes: true,
  metadata: { userId: params.userId, plan: params.plan },
  subscription_data: {
    metadata: { userId: params.userId, plan: params.plan },
  },
});
```

**Mobile path** (`api.mobile.checkout.ts`):
```typescript
stripeClient.checkout.sessions.create({
  customer: dbUser?.stripeCustomerId ?? undefined,
  customer_email: dbUser?.stripeCustomerId ? undefined : ctx.user.email,  // fallback if no customer yet
  mode: "subscription",
  line_items: [{ price: priceId, quantity: 1 }],
  success_url: body.successUrl,
  cancel_url: body.cancelUrl,
  allow_promotion_codes: true,
  metadata: { userId: ctx.user.id, plan: "pro" },
  subscription_data: {
    metadata: { userId: ctx.user.id, plan: "pro" },
  },
});
```

**Key differences:**
- Web path errors if `stripeCustomerId` is missing (assumes customer was created at signup).
- Mobile path falls back to `customer_email` if no customer ID (safety net).
- Both embed `userId` and `plan` in both `session.metadata` AND `subscription_data.metadata`.
- The `{CHECKOUT_SESSION_ID}` token in `success_url` is literal Stripe variable substitution.
- Web path always sets `payment_method_types: ["card"]`; mobile does not.

**Response shape clients depend on:**
- `POST /api/upgrade` → `{ url: string }` (the Checkout Session URL)
- `POST /api/mobile/checkout` → `{ checkoutUrl: string }` (note different key name)

### 4.3 Billing Portal

```typescript
stripeClient.billingPortal.sessions.create({
  customer: dbUser.stripeCustomerId,
  return_url: `${getServerUrl()}/app`,
});
// Returns { url: string }
```

The route immediately redirects to `stripe.url` and renders an error UI if no `stripeCustomerId` is found.

### 4.4 Stripe Customer creation (on user signup)

```typescript
stripeClient.customers.create({
  email: user.email,
  name: user.name,
  metadata: { userId: user.id },
});
// Returns { id: string } — saved as stripeCustomerId on user row
```

### 4.5 Stripe Customer retrieval (on user deletion — before-delete hook)

```typescript
stripeClient.customers.retrieve(user.id)  // NOTE: passes user.id, NOT stripeCustomerId
// This is a bug in current code — it will fail unless user.id === stripeCustomerId
// The actual working path is through stripeClient.subscriptions.list({ customer: ... })
```

> **Implementation note:** The current `beforeDelete` code passes `user.id` to `customers.retrieve()`, which would always 404 since customer IDs start with `cus_`. The intent is to cancel all subscriptions for that user. In the Convex port, use `stripeCustomerId` from the user row (stored in the betterAuth user custom field), or look up subscriptions by `userId` in the Convex `subscriptions` table directly and cancel via `stripeSubscriptionId`.

```typescript
stripeClient.subscriptions.list({ customer: stripeCustomerId })
stripeClient.subscriptions.cancel(subscription.id)
```

### 4.6 Stripe Promotion Code creation (marketing drip)

```typescript
stripeClient.promotionCodes.create({
  coupon: env.STRIPE_COUPON_ID,       // base coupon from env
  code: nanoid(6).toUpperCase(),       // 6-char uppercase alphanumeric
  max_redemptions: 1,
  expires_at: dayjs().add(3, "days").unix(),   // Unix timestamp, 3 days from now
  customer: user?.stripeCustomerId ?? undefined,
  active: true,
  restrictions: { first_time_transaction: true },
});
```

### 4.7 Stripe Subscription retrieve (during checkout.session.completed)

```typescript
stripeClient.subscriptions.retrieve(subscriptionId)
// Used to get: items.data[0].price.id (priceId), status, current_period_start/end, cancel_at_period_end, metadata.plan
```

---

## 5. Webhook event handling (VERBATIM logic)

### 5.1 Signature verification

```typescript
const event = stripeClient.webhooks.constructEvent(
  body,                           // raw text, never parsed JSON
  stripeSignature ?? "",
  process.env.STRIPE_WEBHOOK_SECRET ?? "",
);
```
Returns 400 on failure.

### 5.2 `checkout.session.completed`

**Input:** `Stripe.Checkout.Session`

**Logic:**
1. Guard: if `!session.customer || !session.subscription` → log warn, return (no-op).
2. Resolve `customerId` (string from `session.customer`), `subscriptionId` (string from `session.subscription`).
3. Look up user by `stripeCustomerId`.
4. If not found AND `session.metadata.userId` exists → look up by `userId`, then write `stripeCustomerId` on user row.
5. If still not found → log error, return.
6. Retrieve full subscription from Stripe: `stripeClient.subscriptions.retrieve(subscriptionId)`.
7. Get `priceId` from `stripeSubscription.items.data[0]?.price.id`. If absent → error, return.
8. Get `plan` from `subscription.metadata.plan` via `getPlanFromSubscription()`. If not found → error, return.
9. Upsert subscription row (find by `referenceId = user.id`):
   ```
   {
     plan: plan.name,
     stripeCustomerId: customerId,
     stripeSubscriptionId: subscriptionId,
     status: stripeSubscription.status,
     periodStart: new Date(stripeSubscription.current_period_start * 1000),
     periodEnd: new Date(stripeSubscription.current_period_end * 1000),
     cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
   }
   ```
   If creating new: `id: \`sub_${Date.now()}\`` (timestamp-based, not UUID). In Convex use a proper Convex `_id`.
10. Call `plan.onSubscriptionComplete(dbSubscription, ctx)` — schedules subscription drip.

### 5.3 `customer.subscription.updated`

**Input:** `Stripe.Subscription`

**Logic:**
1. Look up subscription by `stripeSubscriptionId`.
2. If not found → error, return.
3. Get `previousPlan` from `dbSubscription.plan`.
4. Get new `plan` from `subscription.metadata.plan` via `getPlanFromSubscription()`. If not found → keep existing plan name.
5. Update subscription row:
   ```
   {
     plan: planName,
     status: subscription.status,
     periodStart: new Date(subscription.current_period_start * 1000),
     periodEnd: new Date(subscription.current_period_end * 1000),
     cancelAtPeriodEnd: subscription.cancel_at_period_end,
   }
   ```
6. **Upgrade retry logic** (critical business rule): if `previousPlan === "free" && planName !== "free"`:
   - Find all bookmarks for `userId` with `status === "ERROR"` AND `metadata.error` containing string `"Limit exceeded"` (Postgres `json_contains` path query).
   - Reset them to `status = "PENDING"`.
   - Trigger reprocessing for each one via Inngest `"bookmark/process"` event. In Convex: schedule `internal.processing.pipeline.processBookmark` for each.

### 5.4 `customer.subscription.deleted`

**Input:** `Stripe.Subscription`

**Logic:**
1. Look up subscription by `stripeSubscriptionId`.
2. If not found → error, return.
3. Update subscription row:
   ```
   {
     plan: "free",
     status: "canceled",
     cancelAtPeriodEnd: false,
     periodEnd: new Date(),   // set to now
   }
   ```
4. Call `plan.onSubscriptionCanceled()` if defined (currently no-op for both plans).

---

## 6. User creation hook (Stripe customer creation)

In `auth.ts` → `databaseHooks.user.create.after`:
1. Create Stripe customer with `{ email, name, metadata: { userId } }`.
2. Write `stripeCustomerId` back to user row.
3. Create welcome bookmark (not billing, but co-located in the hook).
4. Fire `"user/new-subscriber"` Inngest event → new subscriber drip.

In Convex this becomes an `internal` action called from the betterAuth `user.create` hook (or a Convex scheduler triggered by it). The `stripeCustomerId` is written to the betterAuth `user` table via `betterAuth/data.patchUser`.

---

## 7. User deletion hook (subscription cancellation)

In `auth-params.ts` → `deleteUser.beforeDelete`:
1. Call `stripeClient.customers.retrieve(user.id)` — **NOTE: this is a code bug** (should be `user.stripeCustomerId`). In Convex, read `stripeCustomerId` from the user row.
2. If customer is `deleted` → return (no-op).
3. List all subscriptions: `stripeClient.subscriptions.list({ customer: customerId })`.
4. Cancel each: `stripeClient.subscriptions.cancel(subscriptionId)`.
5. Errors are swallowed (the deletion continues regardless).

---

## 8. Limit enforcement patterns

### 8.1 Bookmark creation limits (`bookmark-validation.ts`)

Called in the bookmark creation flow. Checks:
1. Find subscription with `status IN ("active", "trialing")` for `userId`.
2. Get `metadata` for `userId`.
3. Compute `limits = getAuthLimits(subscription, metadata)`.
4. Count total bookmarks for `userId`.
5. **Pre-limit warning trigger:** if `plan === "free"` AND `limits.bookmarks <= AUTH_LIMITS.free.bookmarks` (i.e., not overridden) AND `totalBookmarks >= limits.bookmarks - 1` → check `hasLimitEmailBeenSent` → if not sent → fire `"marketing/email-on-limit-reached"` Inngest event.
6. If `totalBookmarks >= limits.bookmarks` → throw `BookmarkValidationError("You have reached the maximum number of bookmarks", BookmarkErrorType.MAX_BOOKMARKS)`.
7. Count monthly processing runs (bookmarkProcessingRun records) from start of current calendar month.
8. If `monthlyBookmarkRuns >= limits.monthlyBookmarkRuns` → throw same error type.
9. Optional duplicate URL check (skippable via `skipExistenceCheck: true`).

### 8.2 Chat limits (`check-chat-limits.ts`)

`getChatUsage(userId)`:
- Gets subscription (status active/trialing), metadata, limits.
- Counts `chatUsage` records from start of current calendar month.
- Returns `{ used, limit, remaining, plan }`.

`checkChatLimit(userId)`:
- Calls `getChatUsage`, throws 429 if `remaining <= 0`.
- Error message: `"Chat limit reached. You've used ${used}/${limit} queries this month. Upgrade to Pro for more."`

`checkAndIncrementChatUsage(userId)`:
- Wraps in a DB transaction: count + check + create in one atomic operation.
- Throws if at limit: `"Chat limit reached. You've used ${used}/${monthlyChatQueries} queries this month."`
- Creates a `chatUsage` record on success.

`incrementChatUsage(userId)`:
- Non-transactional insert only (used in streaming contexts where transaction isn't possible).

### 8.3 Export limits (`api.exports.ts`)

- Gets subscription, metadata, limits.
- If `limits.canExport === 0` → return 400 `{ error: "You have reached the maximum number of exports" }`.
- On success: returns `{ csvContent: string, totalBookmarks: number }`.

### 8.4 API key access check (`api-key-auth.ts`)

- Gets subscription and metadata for the API key owner.
- Computes `limits = getAuthLimits({ plan: currentPlan }, metadata)`.
- If `limits.apiAccess === 0` → return 403 `{ error: "Pro plan required" }`.

### 8.5 Process bookmark job limits (`user-limits-check.ts`)

`isUserOverLimits(userId)` returns:
```typescript
{
  isOverLimit: boolean;
  reason: string | null;
  totalBookmarks: number;
  monthlyBookmarkRuns: number;
  limits: { bookmarks: number; monthlyBookmarkRuns: number };
  plan: string;
}
```
Checks: `totalBookmarks >= limits.bookmarks` OR `monthlyBookmarkRuns >= limits.monthlyBookmarkRuns`.
Month boundary: `dayjs().startOf("month")` = first millisecond of the current calendar month (UTC in Dayjs default).

---

## 9. Frontend: user plan client store

`useUserPlan` is a Zustand store initialized with free defaults:
```typescript
{
  name: "free",
  limits: { bookmarks: 20, monthlyBookmarkRuns: 20, monthlyChatQueries: 10, canExport: 0, apiAccess: 0 },
  isLoading: true,
}
```

`InjectUserPlan` component hydrates it from SSR-loaded data (from `api/user/limits` response or session loader). Consumed by:
- `upgrade-page.tsx` — checks `plan.name === "free"` to show upgrade button vs "already subscribed" message.
- `account.keys.tsx` — checks `plan.limits.apiAccess === 0` to gate API key features.

In Convex migration, this store should be replaced by `useQuery(api.billing.queries.getUserPlan)` which is reactive (plan changes auto-push to client).

---

## 10. `/api/user/limits` response shape (external contract)

```json
{
  "plan": "free" | "pro",
  "limits": {
    "bookmarks": 20,
    "monthlyBookmarkRuns": 20,
    "monthlyChatQueries": 10,
    "canExport": 0,
    "apiAccess": 0
  },
  "customLimits": {},
  "subscription": {
    "id": "sub_...",
    "status": "active" | "trialing" | "canceled" | ...,
    "periodEnd": "2024-02-01T00:00:00.000Z"
  } | null
}
```

---

## 11. Convex target layout (from Phase 09)

### `packages/backend/convex/stripe/actions.ts` — `"use node";`

Functions to implement:

**`internal ensureCustomer(ctx, { userId, email, name })`**
- Called after user creation via betterAuth hook.
- Creates Stripe customer: `{ email, name, metadata: { userId } }`.
- Patches user row with `stripeCustomerId` via `ctx.runMutation(internal.betterAuth.data.patchUser, { userId, stripeCustomerId })`.
- Must be idempotent (check if `stripeCustomerId` already set on user before calling Stripe).

**`authAction createCheckout(ctx, { plan, annual, successUrl, cancelUrl })`**
- Derives `priceId` from `PLANS[plan]` + `annual` flag.
- Reads `stripeCustomerId` from user row.
- Calls `stripeClient.checkout.sessions.create(...)` with exact params as documented above.
- Returns `{ url: string }`.
- Error if plan not found or `stripeCustomerId` missing.

**`authAction createBillingPortal(ctx, {})`**
- Reads `stripeCustomerId` from user row.
- Creates billing portal session with `return_url` pointing to `/app`.
- Returns `{ url: string }`.
- Error if no `stripeCustomerId`.

**`internalAction processWebhook(ctx, { body: string, signature: string })`**
- Verifies `stripeClient.webhooks.constructEvent(body, signature, STRIPE_WEBHOOK_SECRET)`.
- Dispatches to sub-handlers for `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`.
- Returns `{ ok: true }` or `{ ok: false, error: string }`.
- Sub-handlers call `ctx.runMutation(internal.subscriptions.mutations.upsertFromWebhook, ...)` and `ctx.runMutation(internal.subscriptions.mutations.updateFromWebhook, ...)`.
- On first pro activation: `ctx.scheduler.runAfter(0, internal.marketing.actions.sendSubscriptionDrip, { userId })`.
- On upgrade from free: query bookmarks with `status === "ERROR"` and error metadata containing "Limit exceeded" → reset to PENDING → schedule reprocessing.

**`internal createPromotionCode(ctx, { userId, stripeCustomerId })`**
- Creates a Stripe promotion code with base coupon `STRIPE_COUPON_ID`, 6-char uppercase code, `max_redemptions: 1`, expires in 3 days, linked to customer, `restrictions.first_time_transaction: true`.
- Returns `{ code: string }`.

**`internal cancelCustomerSubscriptions(ctx, { stripeCustomerId })`**
- Lists + cancels all Stripe subscriptions for the customer.
- Called from user deletion hook.

### `packages/backend/convex/subscriptions/queries.ts`

**`authQuery getMine(ctx, {})`**
- Queries subscriptions by `by_user` index for the calling user.
- Returns the subscription row or `null` (callers should treat null as free).

**`authQuery getUserPlan(ctx, {})`**
- Builds the full plan + limits response:
  ```
  {
    plan: "free" | "pro",
    limits: AuthLimits,          // merged plan + customLimits
    customLimits: Partial<AuthLimits>,
    subscription: { id, status, periodEnd } | null
  }
  ```
- Reads subscription (status active/trialing), user metadata, computes merged limits.

### `packages/backend/convex/subscriptions/mutations.ts`

**`internalMutation upsertFromWebhook(ctx, { userId, stripeCustomerId, stripeSubscriptionId, plan, status, periodStart, periodEnd, cancelAtPeriodEnd })`**
- Finds existing subscription by `by_user` index (referenceId = userId).
- Updates if exists, inserts if not.
- Idempotent by `stripeSubscriptionId`.

**`internalMutation updateFromWebhook(ctx, { stripeSubscriptionId, plan, status, periodStart, periodEnd, cancelAtPeriodEnd })`**
- Finds subscription by `by_stripe_subscription` index.
- Updates the found row.

### `packages/backend/convex/billing/plans.ts`

Export the constants verbatim:
```typescript
export const PLANS = {
  free: {
    bookmarks: 20,
    monthlyBookmarkRuns: 20,
    monthlyChatQueries: 10,
    canExport: 0,
    apiAccess: 0,
  },
  pro: {
    bookmarks: 50000,
    monthlyBookmarkRuns: 1500,
    monthlyChatQueries: 200,
    canExport: 1,
    apiAccess: 1,
  },
} as const;

export type PlanName = keyof typeof PLANS;
export type PlanLimits = typeof PLANS[PlanName];
```

Plus the `parseCustomLimits()` and `getLimits(plan, metadata)` helpers (ported from `getAuthLimits` + `parseCustomAuthLimits`).

### Convex `subscriptions` table schema

```typescript
subscriptions: defineTable({
  userId: v.string(),                      // referenceId — betterAuth user id
  plan: v.string(),                        // "free" | "pro"
  stripeCustomerId: v.optional(v.string()),
  stripeSubscriptionId: v.optional(v.string()),
  status: v.optional(v.string()),          // "active" | "trialing" | "canceled" | ...
  periodStart: v.optional(v.number()),     // ms timestamp
  periodEnd: v.optional(v.number()),       // ms timestamp
  cancelAtPeriodEnd: v.optional(v.boolean()),
  seats: v.optional(v.number()),
})
  .index("by_user", ["userId"])
  .index("by_stripe_subscription", ["stripeSubscriptionId"])
  .index("by_stripe_customer", ["stripeCustomerId"])
```

Note: `periodStart`/`periodEnd` as `number` (ms) in Convex instead of `DateTime` in Postgres. Convert: `subscription.current_period_start * 1000`.

---

## 12. Webhook route in `convex/http.ts`

```typescript
http.route({
  path: "/stripe/webhook",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const body = await req.text();
    const signature = req.headers.get("stripe-signature") ?? "";
    const res = await ctx.runAction(internal.stripe.actions.processWebhook, { body, signature });
    return new Response(JSON.stringify(res), { status: res.ok ? 200 : 400 });
  }),
});
```

Point the Stripe dashboard webhook at: `https://<deployment>.convex.site/stripe/webhook`

---

## 13. Frontend migration (Phase 16)

### Routes to update

| Route | Change |
|-------|--------|
| `/upgrade` | Replace `upfetch("/api/upgrade")` with `useConvexMutation(api.stripe.actions.createCheckout)` |
| `/upgrade/new-pricing` | Same as above |
| `/upgrade/success` | No data change; confetti + Tella video are pure UI |
| `/billing` | Replace `createServerFn` calling Stripe directly with `convexQuery(api.stripe.actions.createBillingPortal)` or a loader calling it; redirect on URL |

### `useUserPlan` store

Replace `InjectUserPlan` + the Zustand store with `useQuery(convexQuery(api.subscriptions.queries.getUserPlan, {}))` to get reactive plan updates. The store shape (`name`, `limits`, `isLoading`) should be preserved for backward compatibility until all consumers are updated.

---

## 14. Pricing display constants (from UI, not configurable)

| Plan | Monthly price | Annual price (displayed) | Annual tagline |
|------|--------------|------------------------|----------------|
| Free | $0 | — | — |
| Pro | $9/mo | $5/mo | "5 months free!" |

The UI renders `monthly ? "9" : "5"` and `monthly ? "Billed monthly." : "Billed annually."`. The `annual` flag passed to the checkout is `!monthly` (default is yearly = not monthly).

The `-49%` badge is hardcoded on the Yearly tab in both pricing UIs.

---

## 15. Security and validation guards (Phase 17 checklist)

| Guard | Current location | Convex target |
|-------|-----------------|---------------|
| Auth required before checkout | `requireUser()` in route handler | `authAction` builder (derives `userId` server-side) |
| Auth required for billing portal | `getRequiredUserOrRedirect()` in loader | `authAction` builder |
| Webhook signature verification | `stripeClient.webhooks.constructEvent` in route | Same pattern in `processWebhook` internalAction |
| Raw body preservation | `request.text()` before any parse | `req.text()` in httpAction |
| `stripeCustomerId` ownership | Implicit (user row lookup) | Implicit (lookup by `userId` from auth context) |
| Plan metadata in subscription | `subscription.metadata.plan` must match known plans | Same check in `getPlanFromSubscription` equivalent |
| API access guard | `limits.apiAccess === 0` check in `validateApiKey` | Same check using `getLimits()` from `billing/plans.ts` |
| Export access guard | `limits.canExport === 0` check in exports route | Same in Convex export action |
| Idempotent webhook writes | Upsert by `stripeSubscriptionId` | `updateFromWebhook` uses `by_stripe_subscription` index |
| Custom limits: admin-only path | Currently no server-side role check on metadata writes; set via admin panel | Must be internal-only mutation; admin panel calls `requireAdmin` |

---

## 16. Edge cases and gotchas

1. **`deleteUser.beforeDelete` bug:** passes `user.id` to `customers.retrieve()` instead of `user.stripeCustomerId`. The Convex port must use the `stripeCustomerId` field. If it is null/absent → skip Stripe cancellation silently (user may have been created before the Stripe customer hook ran).

2. **Webhook idempotency:** Stripe can replay webhooks. The `upsertFromWebhook` mutation must be idempotent. Use `by_stripe_subscription` index for all updates. For `checkout.session.completed`, upsert by `userId` (referenceId).

3. **Missing `stripeCustomerId` on checkout:** the web path throws immediately if `stripeCustomerId` is missing. The mobile path falls back to `customer_email`. In Convex, `ensureCustomer` should be a synchronous pre-check in `createCheckout`: if user has no `stripeCustomerId`, call `ensureCustomer` first (idempotent create).

4. **Plan derivation from subscription metadata vs price ID:** The webhook handler uses `subscription.metadata.plan` (set during checkout session creation in `subscription_data.metadata`). NOT the price ID. The price ID is only used to confirm the item exists. If `metadata.plan` is absent from the subscription → the handler keeps the existing DB plan (update path) or returns early with an error (create path).

5. **Month boundary:** monthly limits are measured from `dayjs().startOf("month")`. In Convex (no Dayjs), use `new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime()` for start-of-month ms.

6. **Upgrade retry for ERROR bookmarks:** the JSON path filter `metadata.error` contains string `"Limit exceeded"` (Postgres `jsonb` path query). In Convex, since bookmarks store `metadata` as a Convex object, use a Convex query filter. Because Convex does not support substring index filters, this requires fetching ERROR bookmarks for the user and filtering in JavaScript: `bookmark.metadata?.error?.includes("Limit exceeded")`.

7. **`sub_${Date.now()}` ID generation:** the current code generates subscription IDs like `sub_1710000000000`. In Convex, use the auto-generated `_id`. No need to replicate this pattern.

8. **Subscription drip trigger timing:** `onSubscriptionComplete` fires synchronously in the webhook handler (it's `await`-ed). In Convex, use `ctx.scheduler.runAfter(0, ...)` after the mutation to achieve the same near-immediate scheduling.

9. **Promo code expiry:** `dayjs().add(3, "days").unix()` — Unix seconds (not ms). Stripe `expires_at` is Unix seconds.

10. **`allow_promotion_codes: true`** is set on both checkout session paths. This enables the promo code field in Stripe Checkout UI. It is distinct from `discounts` array.

11. **Cookie prefix:** The existing app uses `advanced.cookiePrefix: "save-it"` in Better Auth. The Convex migration must preserve this (`BETTER_AUTH_COOKIE_PREFIX=save-it`) for session continuity.

12. **Webhook response shape:** The current route returns `Response.json({ ok: true })` on success and `Response.json({ error, eventType }, { status: 500 })` on handler error. The `processWebhook` action should return `{ ok: boolean, error?: string }` and the httpAction wraps it.

13. **Stripe API version:** Must remain `"2025-02-24.acacia"` to match the existing webhook events format.

14. **`limitEmailSentAt` in metadata:** Before sending the limit-reached email, the job sets `limitEmailSentAt` to ISO string. The Convex port needs a `setLimitEmailSent` internal mutation that writes `metadata.limitEmailSentAt`. The check `hasLimitEmailBeenSent` reads this field. This metadata lives on the betterAuth `user` row.

15. **No `seats` field usage:** the `Subscription` model has a `seats` column but it is never set or read in the current codebase. Include it in the Convex schema for data migration completeness but do not implement any seats logic.
