# Phase 10 — Emails + Marketing Drips

**Goal:** send transactional email via the `@convex-dev/resend` component, and reimplement all Inngest
marketing drip sequences as Convex scheduled functions + crons.

**Current logic to port:** `apps/web/src/lib/mail/*` (resend, send-email, send-marketing-email),
`apps/web/src/lib/inngest/*marketing*` jobs, the `emails/` React Email templates.

**Depends on:** Phase 02 (auth hooks schedule emails), 09 (subscription/limit drips).

---

## Transactional email
`convex/email/mutations.ts` (model: nowstack-saas):
```ts
import { Resend } from "@convex-dev/resend";
import { components } from "../_generated/api";
export const resend = new Resend(components.resend, { testMode: false });
export const sendEmail = internalMutation({ args: { to, subject, html, from?, replyTo? },
  handler: async (ctx, a) => { await resend.sendEmail(ctx, { from: a.from ?? FROM, to: a.to, subject: a.subject, html: a.html }); }});
```
`convex/email/actions.tsx` (`"use node"`) — `sendMarkdownEmail` / templated senders: render React Email
(reuse `emails/` components, ported to the backend or imported), then `runMutation(internal.email.mutations.sendEmail)`.

Wire the Phase 02 stubs:
- `emailOTP.sendVerificationOTP` → schedule `sendOtpEmail`.
- `magicLink.sendMagicLink` → schedule `sendMagicLinkEmail`.
- `emailVerification.sendVerificationEmail`, email change, account deletion confirmations.

> `sendMarketingEmail` must keep the **unsubscribe guard**: skip if `user.unsubscribed`. Port from
> `send-marketing-email.ts`. Honor `metadata.limitEmailSent` idempotency flags.

## Marketing drip sequences → scheduler
Each Inngest job becomes a chain of `ctx.scheduler.runAfter(delay, internal.marketing.*.step, {...})`,
or a single internal action that schedules its next step. Port these:

1. **new-subscriber** (`marketingEmailsOnNewSubscriberJob`) — triggered from `auth/hooks.onUserCreated`:
   welcome → (2h, if no bookmarks) chrome-extension nudge → usage tips → search tips → premium pitch.
   Use `scheduler.runAfter` with the original delays (2h, then 24h cadence). Guard each step with a fresh
   read (e.g. skip extension nudge if the user already has bookmarks).
2. **subscription** (`marketingEmailsOnSubscriptionJob`) — from `stripe.processWebhook` on first
   activation: thank-you → premium how-to → let's-talk → commitment (1-day cadence).
3. **limit-reached** (`marketingEmailsOnLimitReachedJob`) — from `billing/limits` when a user hits a
   cap: mint Stripe promo (`stripe.actions.createPromotionCode`, 3-day expiry) → discount email
   sequence (3 emails / 2 days). Idempotent per email via `metadata.limitEmailSent`.
4. **batch-email** (`batchMarketingEmailJob`) — a `crons.ts` job that paginates eligible (non-
   unsubscribed) users in batches of 100 with small delays. Use `crons.interval`/`crons.cron` only.

`convex/crons.ts`:
```ts
import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";
const crons = cronJobs();
// e.g. monthly counter reset, optional batch campaigns, query-embedding-cache sweep
crons.interval("reset monthly run counters", { hours: 24 }, internal.marketing.maintenance.resetMonthly, {});
export default crons;
```

## Unsubscribe
Keep an unsubscribe endpoint (httpAction in `convex/http.ts` or a web route) that sets
`user.unsubscribed = true` via `betterAuth/data.patchUser`. Preserve existing unsubscribe links.

## Acceptance criteria
- OTP / magic-link emails arrive (transactional path works end-to-end).
- New signup triggers the welcome drip with correct delays; conditional steps respect current state.
- Upgrade + limit drips fire from their Convex triggers; unsubscribed users are skipped.
- Promo-code email mints a valid Stripe code.

## Risks
- `@convex-dev/resend` batches/queues sends — confirm `testMode: false` in prod and a verified sender.
- Long drips rely on the scheduler surviving deploys (it does), but very long delays (>days) are fine via
  `runAfter`. Keep idempotency flags to avoid double-sends on retries.
- React Email rendering needs `"use node"`; keep template rendering in the action file.
