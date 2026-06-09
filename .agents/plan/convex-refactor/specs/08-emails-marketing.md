# Spec 08 — Emails + Marketing (Phase 10 + Phase 17 B13)

## 1. Overview

This spec covers the full porting of the transactional and marketing email system from
Inngest-based drip sequences + Resend REST calls to Convex scheduled functions + the
`@convex-dev/resend` component. It incorporates the Phase 17 B13 security fix (tokenised
unsubscribe links).

---

## 2. Current source files and responsibilities

### 2.1 Mail layer

#### `apps/web/src/lib/mail/resend.ts`
- Instantiates `Resend` SDK using `env.RESEND_API_KEY`.
- Exports `resendMailAdapter: MailAdapter` — wraps `resend.emails.send(...)`, appends
  `env.HELP_EMAIL` as `replyTo` if none supplied, normalises the result to
  `{ error: null, data: { id: string } }` or `{ error: Error, data: null }`.

#### `apps/web/src/lib/mail/send-email.ts`
- Exports `sendEmail(params)` — the single send-email entrypoint.
- Behaviour:
  1. In `NODE_ENV === "development"`, prepends `[DEV]` to the subject.
  2. Skips actual send (returns a fake `nanoid()` id) when `to` starts with
     `"playwright-test-"` (test guard).
  3. Accepts `html` as either a raw string or a React element; if a React element, renders
     via `@react-email/render` + `pretty()`.
  4. Falls back `from` to `env.RESEND_EMAIL_FROM` (default value:
     `"Melvyn from SaveIt.now <help@re.saveit.now>"`).
  5. Calls `mailAdapter.send(...)` (currently `resendMailAdapter`).
  6. Logs an error if `result.error`.
- Env vars consumed: `NODE_ENV`, `RESEND_EMAIL_FROM`.
- Type `MailAdapter` — `{ send: (EmailParams) => Promise<{error,data}> }`.

#### `apps/web/src/lib/mail/send-marketing-email.ts`
- Exports `sendMarketingEmail(params)` — wraps `sendEmail` with the **unsubscribe guard**.
- Params: `{ userId, to, subject, preview, text }`.
- Logic:
  1. Fetches `user.unsubscribed` and `user.email` from Prisma by `userId`.
  2. If user not found → throws `Error("User with ID ${userId} not found")`.
  3. If `user.unsubscribed === true` → throws `UserUnsubscribedError` (subclass of `Error`,
     name `"UserUnsubscribedError"`).
  4. Appends unsubscribe link to the markdown content:
     ```
     \n\n---\n\n[Unsubscribe from marketing emails](${getServerUrl()}/unsubscribe/${userId})
     ```
  5. Calls `sendEmail({ to, subject, text, html: MarkdownEmail({ markdown: contentWithLink, preview }) })`.
- Exports `UserUnsubscribedError` class (callers can `instanceof` check).

---

### 2.2 Email templates

#### `apps/web/emails/email-layout.tsx`
- React Email base layout wrapping all emails.
- Renders `<Html><Head /><Body>` with white background and system font stack.
- Inserts a top logo: `<Img src="${baseUrl}/images/logo.png" height={32}>` where `baseUrl`
  is `getServerUrl()` (with fallback to `https://saveit.now` for `localhost` so email
  clients can load the image).
- Bottom footer: logo + "SaveIt.now" text + "Melvyn, from SaveIt.now" + "Bali, Indonesia".
- Accepts `disableTailwind` prop — when true, renders children directly (used by
  `MarkdownEmail` to avoid Tailwind conflicting with `<Markdown>`).

#### `apps/web/emails/markdown.emails.tsx`
- Accepts `{ markdown: string, preview?: string, disabledSignature?: boolean }`.
- Unless `disabledSignature`, appends:
  ```
  \n\nBest,\n\nMelvyn from SaveIt.now
  ```
- Normalises markdown by trimming each line.
- Renders `<EmailLayout disableTailwind>` wrapping a `<Preview>` and `<Markdown>` component.
- Custom markdown styles: `p` and `li` at `1.125rem / 1.5rem`; `link` in `#6366f1`.
- This is the ONLY email template currently — all marketing emails are plain markdown.

---

### 2.3 Email constants (verbatim template text)

#### `apps/web/src/lib/inngest/marketing/emails.const.ts`

All values are multiline strings referencing `getServerUrl()` and `APP_LINKS` constants.
The APP_LINKS referenced are: `extensions` (`/extensions`), `app` (`/app`), `imports`
(`/imports`), `upgrade` (`/upgrade`), `changelog` (`/changelog`).

**WELCOME_EMAIL** (static string):
```
Hi,

I'm Melvyn, the founder of SaveIt.now.

I built this app because I had over 500 bookmarks and I kept losing the good ones. Chrome bookmarks weren't helping, and Notion felt too heavy.

SaveIt.now is my solution - a minimal, fast, and smart way to save and find links. It uses AI to summarize content, generate tags, take screenshots, and make everything searchable instantly.

This tool is something I use daily, and I'll keep improving it as long as I need it myself.

Here's how to get started:

1. Install the Extension:  
${getServerUrl()}${APP_LINKS.extensions}

2. Open the app and save your first link:  
${getServerUrl()}${APP_LINKS.app}

If you hit a problem or just want to share feedback, write me at help@saveit.now or DM me on Twitter: https://x.com/melvynxdev

Thanks for trying SaveIt.now.
```

**CHROME_EXTENSION_EMAIL** (static string):
```
Hi,

I'm Melvyn, the founder of SaveIt.now.

I noticed you haven't installed the Chrome extension yet. The extension is the fastest way to save bookmarks while browsing.

Here's why you should install it:

✅ Save any page with one click
✅ AI automatically generates tags and summaries
✅ Works on any website
✅ Syncs instantly with your SaveIt.now account

Install the Extension here:
${getServerUrl()}${APP_LINKS.extensions}

Once installed, you can save bookmarks directly from any webpage. Just click the SaveIt.now icon in your browser toolbar.
```

**HOW_USE_CHROME_EXTENSION_EMAIL** (static string):
```
Hi,

The chrome extension lets you save images and bookmarks from any website.

For example, you find "Supabase UI" beautiful and want to save it, just click on the corner (make sure you pin the extension) to save the bookmark:

You can also right click on any website to save the page.

Finally, you can right click on any image to save it.

After the image is saved, you'll be able to search it because our AI analyzes the image and generates a description.

So... if you don't have the extension yet, download it here: ${getServerUrl()}${APP_LINKS.extensions}
```

**HOW_TO_IMPORT_BOOKMARKS_EMAIL** (static string):
```
Hi,

You might have Chrome bookmarks or other tools bookmarks that you want to import.

For that you can just go to the import page: ${getServerUrl()}${APP_LINKS.imports}

In this page, it's really simple...

You can drag and drop any file:

• csv
• html  
• pdf

And we will extract the links for import. We don't support importing tags, text or anything else for our commitment to minimalism.

You can also just copy/paste any list of links into the input.

And that's it! 📋

The import can take a while... on average, it's 30 seconds per bookmark. If you import 20 bookmarks, it will take 10 minutes.
```

**HOW_TO_USE_BOOKMARKS_EMAIL** (static string):
```
Hi,

I see you're getting started with SaveIt.now! Here are some tips to help you get the most out of your bookmarks:

1. Save more than just links

Articles, videos, tweets, images, save anything valuable.

2. Save more than you think

Every time you find something valuable... even if you're not sure: save it.

You don't need to "cherry-pick" the best ones... just save everything.

Our system will help you find them later.

3. Do not organize

No need to organize, add notes, or tags. Our software is intelligent and will help you find them later.

Try saving a few more bookmarks and see how the AI helps organize them automatically.

Start saving: ${getServerUrl()}${APP_LINKS.app}
```

**HOW_TO_SEARCH_BOOKMARKS_EMAIL** (static string):
```
Hi,

Now that you have some bookmarks saved, let me show you how to find them quickly:

🔍 Smart Search

Type anything related to your bookmark - title, content, or tags. The AI understands context, so "React tutorial" will find React-related content.

Quick Filters

Filter by tags, dates, or bookmark types. Use the sidebar to browse by categories.

Advanced Search

Search within specific date ranges. Find bookmarks by domain or content type. Combine multiple filters for precise results.

Pro Tips

Use the search bar at the top of any page. Bookmark important searches for quick access. The more you save, the smarter the search becomes.

Try searching for something now: ${getServerUrl()}${APP_LINKS.app}
```

**PREMIUM_COMMITMENT_EMAIL** (static string):
```
Hi,

I hope SaveIt.now has been helpful in organizing your bookmarks!

As a founder, I'm committed to building the best bookmark manager possible. Here's what I'm working on:

🚀 What's Coming Next

Better AI summaries and tagging. Team collaboration features. Mobile app improvements. Advanced search filters.

💪 My Commitment

I use SaveIt.now daily for my own bookmarks. Regular updates and improvements. Direct support from me personally. No ads, ever - just a clean, fast experience.

📈 Ready to Go Premium?

Upgrade to unlock unlimited bookmarks, priority support, and early access to new features.

Upgrade now: ${getServerUrl()}${APP_LINKS.upgrade}

Thanks for being part of the SaveIt.now community!

P.S. Hit reply if you have any feedback or questions - I read every email personally.
```

**SUBSCRIPTION_THANK_YOU_EMAIL** (static string):
```
Hey,

Thank you so much for your trust!

You just upgraded to the PRO plan and I really want to personally thank you.

As a founder, it's important for me.

If you want to reach out by email or say anything, feel free and I'll reply as soon as possible.

Your money helps me build the best bookmark manager possible.

If you need help, reach me on Twitter @melvynxdev or just reply to this email.

I'll reply as soon as possible.
```

**SUBSCRIPTION_HOW_TO_USE_PREMIUM_EMAIL** (static string):
```
Hi,

Let me show you how to use your premium effectively:

With premium, you have unlimited bookmarks (with fair usage). Save everything you find online.

If a website generates wrong content, just use the report button so I can check it.

That's it! Start saving everything: ${getServerUrl()}${APP_LINKS.app}
```

**SUBSCRIPTION_LETS_TALK_EMAIL** (static string):
```
Hi,

Let's talk? 💬

I don't like calls, but I like email and voice. Just reply to this email to help me know:

• Why you joined premium
• How we can help you
• What you like
• What you dislike

I read every email personally.
```

**SUBSCRIPTION_OUR_COMMITMENT_EMAIL** (static string):
```
Hi,

As a pro member, I want to make you a promise.

My commitment to you:

1. Simplicity is the key. No extra features. Just the features you need.
2. No ads. No tracking. No data collection.
3. Extra layers of database security (our database is backed up to avoid any data loss)

We avoid useless features, but still, we create a lot of micro improvements that you can find here: ${getServerUrl()}${APP_LINKS.changelog}

Thanks for being pro!
```

**LIMIT_REACHED_DISCOUNT_EMAIL** (function `(promoCode: string) => string`):
```
Hi,

You reached your bookmark limit 🥲

I see you're really using SaveIt.now. That's awesome!

Here's a special discount just for you:

* First month for only $1 (instead of $9)
* Or yearly plan with $8 OFF

Use code: `${promoCode}`

**This code expires in 2 days and is only for you.**

Upgrade now: ${getServerUrl()}${APP_LINKS.upgrade}

When you are on this page, just choose yearly or monthly pricing and then add the coupon during the checkout : 

<img src="${getServerUrl()}/images/coupon.png" alt="Limit reached discount" />
```
NOTE: The email text says "2 days" but the Stripe promo actually expires in **3 days** (`dayjs().add(3, "days").unix()`). This is a pre-existing inconsistency — preserve both as-is.

**LIMIT_REACHED_REMINDER_EMAIL** (function `(promoCode: string) => string`):
```
Hi,

Remember: you have a special discount! 💰

Your promo code `${promoCode}` is still valid for:

* First month at only $1
* Or yearly plan with $8 OFF

Don't miss out - it expires tomorrow.

Upgrade now: ${getServerUrl()}${APP_LINKS.upgrade}
```

**LIMIT_REACHED_LAST_CHANCE_EMAIL** (function `(promoCode: string) => string`):
```
Hi,

Last chance: today only $1 for the first month! ⏰

Your code `${promoCode}` expires today.

This is your final reminder to get premium for just $1.

After today, it goes back to the regular price.

Upgrade now: ${getServerUrl()}${APP_LINKS.upgrade}
```

---

### 2.4 Inngest marketing jobs

#### `apps/web/src/lib/inngest/marketing/marketing-emails-on-new-subscriber.job.ts`

**Event trigger:** `"user/new-subscriber"` — fired in `apps/web/src/lib/auth.ts` inside
`databaseHooks.user.create.after` (immediately after a new user record is created).

**Event data shape:** `{ userId: string }`

**Inngest config:**
- `id: "marketing-emails-on-new-subscriber"`
- `concurrency: { key: "event.data.email", limit: 1 }` (one run per email at a time)

**Step-by-step sequence (exact delays must be preserved):**

| Step | Action | Delay before next step |
|------|--------|------------------------|
| 1 | Fetch user email from DB | — |
| 2 | Send WELCOME_EMAIL | subject: `"Welcome to SaveIt.now (from Melvyn)"`, preview: `"Just a quick note to say welcome to SaveIt.now"` |
| 3 | `sleep("wait-2-hours", "2h")` | **2 hours** |
| 4 | Check if user has any bookmarks (`prisma.bookmark.count({ where: { userId } }) > 0`) | — |
| 5 | If count === 0: send CHROME_EXTENSION_EMAIL | subject: `"Install the SaveIt.now Chrome Extension"`, preview: `"Install the SaveIt.now Chrome Extension"` |
| 6 | If step 5 ran: `sleep("wait-24h-after-extension", "24h")` | **24 hours** |
| 7 | Send HOW_USE_CHROME_EXTENSION_EMAIL | subject: `"Master the art of finding your bookmarks"`, preview: `"How to use the Chrome extension effectively"` |
| 8 | `sleep("wait-24h-after-extension", "24h")` | **24 hours** (note: step-id collision with step 6 — Inngest deduplicates by step id within a run so this still works but the Convex port should use distinct delay names) |
| 9 | Send HOW_TO_IMPORT_BOOKMARKS_EMAIL | subject: `"How to import your bookmarks"`, preview: `"How to import your existing bookmarks"` |
| 10 | `sleep("wait-24h-after-import-bookmarks", "24h")` | **24 hours** |
| 11 | Check bookmark count again (`prisma.bookmark.count`) | — |
| 12 | If count < 10: send HOW_TO_USE_BOOKMARKS_EMAIL | subject: `"How to get the most out of your bookmarks"`, preview: `"Tips to get the most out of your bookmarks"` |
| 13 | If step 12 ran: `sleep("wait-24h-after-usage-tips", "24h")` | **24 hours** |
| 14 | Send HOW_TO_SEARCH_BOOKMARKS_EMAIL | subject: `"Master the art of finding your bookmarks"`, preview: `"Master the art of finding your bookmarks"` |
| 15 | `sleep("wait-24h-before-premium", "24h")` | **24 hours** |
| 16 | Send PREMIUM_COMMITMENT_EMAIL | subject: `"My commitment to SaveIt.now"`, preview: `"My commitment to SaveIt.now"` |

Each email is sent via `sendMarketingEmail` which re-fetches `user.unsubscribed` before each
send. If the user has unsubscribed between steps, `UserUnsubscribedError` is thrown and that
specific step fails (the job terminates; subsequent emails are not sent).

**Conditional logic summary:**
- After 2h: if bookmark count === 0, send Chrome extension nudge + add extra 24h delay before
  step 7.
- After import email: if bookmark count < 10, send usage tips + add extra 24h delay before
  search email.
- If either condition is false, the corresponding email is **skipped entirely** (no delay
  added for the skipped email).

---

#### `apps/web/src/lib/inngest/marketing/marketing-emails-on-subscription.job.ts`

**Event trigger:** `"user/subscription"` — fired in `apps/web/src/lib/auth/stripe/auth-plans.ts`
inside `AUTH_PLANS["pro"].onSubscriptionComplete` callback (when a Stripe subscription is
first activated for the `"pro"` plan).

**Event data shape:** `{ userId: string }`

**Inngest config:**
- `id: "marketing-emails-on-subscription"`
- `concurrency: { key: "event.data.email", limit: 1 }`

**Step-by-step sequence:**

| Step | Action | Delay before next |
|------|--------|-------------------|
| 1 | Fetch full user object from DB | — |
| 2 | Send SUBSCRIPTION_THANK_YOU_EMAIL | subject: `"Welcome to SaveIt.pro !"`, preview: `"Thanks for your trust!"` |
| 3 | `sleep("wait-1-day-after-thank-you", "1d")` | **24 hours** |
| 4 | Send SUBSCRIPTION_HOW_TO_USE_PREMIUM_EMAIL | subject: `"How to use your premium effectively"`, preview: `"How to use your premium effectively"` |
| 5 | `sleep("wait-1-day-after-premium-tips", "1d")` | **24 hours** |
| 6 | Send SUBSCRIPTION_LETS_TALK_EMAIL | subject: `"Let's talk? 💬"`, preview: `"Let's talk?"` |
| 7 | `sleep("wait-1-day-after-lets-talk", "1d")` | **24 hours** |
| 8 | Send SUBSCRIPTION_OUR_COMMITMENT_EMAIL | subject: `"Our commitment to you"`, preview: `"Our commitment to you"` |

All four emails use `sendMarketingEmail` — unsubscribe guard applies on each step.

---

#### `apps/web/src/lib/inngest/marketing/marketing-emails-on-limit-reached.job.ts`

**Event trigger:** `"marketing/email-on-limit-reached"` — fired in
`apps/web/src/lib/database/bookmark-validation.ts` when:
1. The user is on the `"free"` plan (subscription.plan === null or "free").
2. Their custom limit is not overridden above the default free limit
   (`limits.bookmarks <= AUTH_LIMITS.free.bookmarks`).
3. Total bookmarks `>= limits.bookmarks - 1` (approaching or at limit).
4. `hasLimitEmailBeenSent(userId)` returns `false` — `metadata.limitEmailSentAt` is null/absent.

**Event data shape:** `{ userId: string }`

**Inngest config:**
- `id: "marketing-emails-on-limit-reached"`
- `concurrency: { key: "event.data.email", limit: 1 }`
- `idempotency: "event.data.email"` — **Inngest-level deduplication** so the entire job only
  ever runs once per email address.

**Step-by-step sequence:**

| Step | Action | Notes |
|------|--------|-------|
| 1 | Fetch `user.email` and `user.stripeCustomerId` from DB | — |
| 2 | `create-promo-code`: mint Stripe promo code via `stripeClient.promotionCodes.create(...)` | See below |
| 3 | Send LIMIT_REACHED_DISCOUNT_EMAIL(promoCode) | subject: `"You reached your limit! Here's a special discount 🎁"`, preview: `"You reached your limit! Here's a special discount"` |
| 4 | `mark-email-sent`: call `setLimitEmailSent(userId)` — writes `metadata.limitEmailSentAt = new Date().toISOString()` | Idempotency flag |
| 5 | `sleep("wait-1-day-after-discount", "1d")` | 24 hours |
| 6 | Send LIMIT_REACHED_REMINDER_EMAIL(promoCode) | subject: `"Don't forget your $1 discount! 💰"`, preview: `"Don't forget your $1 discount!"` |
| 7 | `sleep("wait-1-day-after-reminder", "1d")` | 24 hours |
| 8 | Send LIMIT_REACHED_LAST_CHANCE_EMAIL(promoCode) | subject: `"Last chance: $1 deal expires today! ⏰"`, preview: `"Last chance: $1 deal expires today!"` |

**Stripe promo code creation (exact parameters):**
```ts
stripeClient.promotionCodes.create({
  coupon: env.STRIPE_COUPON_ID,   // env var: STRIPE_COUPON_ID
  code: nanoid(6).toUpperCase(),   // 6-char alphanumeric uppercase random code
  max_redemptions: 1,
  expires_at: dayjs().add(3, "days").unix(),  // Unix timestamp 3 days from now
  customer: user.stripeCustomerId ?? undefined,  // tie to the user's Stripe customer if available
  active: true,
  restrictions: {
    first_time_transaction: true,
  },
})
```

The `promoCode` string (returned from `promotionCodes.create`) is the same variable reused
across all three limit-reached emails.

---

#### `apps/web/src/lib/inngest/marketing/batch-marketing-email.job.ts`

**Event trigger:** `"marketing/batch-email"` — fired from admin route
`apps/web/src/routes/api.admin.send-email.ts` (POST `/api/admin/send-email`) which requires
`adminRoute` authentication (role === "admin").

**Event data shape:** `{ subject: string, subheadline: string, markdown: string }`

**Inngest config:**
- `id: "batch-marketing-email"`
- `concurrency: { key: "event.data.subject", limit: 1 }` (one campaign per subject at a time)

**Step-by-step sequence:**
1. Fetch all eligible users via `getMarketingEligibleUsers()`:
   - Queries `prisma.user.findMany({ where: { unsubscribed: false }, select: { id, email, name } })`
   - Filters out null emails.
   - Returns `MarketingEligibleUser[]` with `{ id, email, name }`.
2. Chunk users into batches of `BATCH_SIZE = 100`.
3. For each batch `i`:
   a. Step `send-batch-${batchNumber}`: sends to all 100 users in parallel via `Promise.all`.
   b. Each individual send uses `sendEmail` (NOT `sendMarketingEmail`) directly — different from
      drip sequences. It manually appends unsubscribe link and builds HTML from `MarkdownEmail`.
   c. `from` is hardcoded to `"Melvyn from SaveIt.now <help@re.saveit.now>"` (not env var default).
   d. Between batches (except last): `sleep("wait-after-batch-${batchNumber}", "1s")` — **1 second delay**.
4. Returns `{ success, totalRecipients, totalBatches, subject }`.

**Batch send per-user logic:**
```ts
const markdownWithUnsubscribe = markdown + `\n\n---\n\n[Unsubscribe from marketing emails](${getServerUrl()}/unsubscribe/${userId})`;
sendEmail({
  from: "Melvyn from SaveIt.now <help@re.saveit.now>",
  to: user.email,
  subject,
  text: markdownWithUnsubscribe,
  html: MarkdownEmail({ markdown: markdownWithUnsubscribe, preview: subheadline }),
});
```

NOTE: The batch job does NOT re-check `user.unsubscribed` per-user during the send — it
relies on the eligibility query at the start. A user who unsubscribes after the query begins
but before their batch is processed could receive the email. The Convex port should preserve
this as-is (querying once is intentional for efficiency at scale).

---

### 2.5 Idempotency — `metadata.limitEmailSent`

#### `apps/web/src/lib/database/user-metadata.utils.ts`

The `metadata` field on the `User` model is a freeform `Json?` column validated with Zod:
```ts
const UserMetadataSchema = z.object({
  limitEmailSentAt: z.string().optional(),   // ISO date string
  customLimits: CustomLimitsSchema.optional(),
}).passthrough();
```

Key functions:
- `getUserMetadata(userId)` — fetches and Zod-parses `user.metadata`, returns `{}` on missing.
- `updateUserMetadata(userId, updates)` — merges updates into existing metadata, persists.
- `setLimitEmailSent(userId)` — sets `metadata.limitEmailSentAt = new Date().toISOString()`.
- `hasLimitEmailBeenSent(userId)` — returns `!!metadata.limitEmailSentAt`.

This is the **idempotency flag** for the limit-reached drip. The Inngest job also has
`idempotency: "event.data.email"` at the job level. In Convex, both mechanisms must be
reproduced: the DB flag is the primary guard (checked before triggering the drip), and the
Convex equivalent of idempotency (e.g. checking `metadata.limitEmailSentAt` before scheduling)
prevents duplicate drips.

---

### 2.6 Unsubscribe route (INSECURE — must be fixed in Convex)

#### `apps/web/src/routes/api.unsubscribe.$userId.ts`

**Current implementation (INSECURE):**
```
POST /api/unsubscribe/:userId
```
- No authentication, no token, no HMAC.
- Accepts bare `userId` path parameter.
- Fetches user, returns 404 if not found.
- Returns early success if already unsubscribed.
- Sets `user.unsubscribed = true` via `prisma.user.update`.
- Response: `{ success: true, message: "Successfully unsubscribed from marketing emails" }`

**Current unsubscribe page:** `apps/web/src/routes/unsubscribe.$userId.tsx`
- `GET /unsubscribe/:userId` — SSR page, loads user record, shows form.
- Form calls `POST /api/unsubscribe/:userId` via `upfetch`.

**Phase 17 B13 requirement (MUST FIX):**
The Convex replacement must use a **signed token** in unsubscribe URLs. Do NOT reproduce the
bare `userId` vulnerability. The `UnsubscribeForm` and the backend endpoint must be updated
together. Suggested scheme:
- Generate an HMAC-SHA256 token = `HMAC(BETTER_AUTH_SECRET, userId + ":" + timestamp)` at
  email-send time, append as a query parameter to the unsubscribe URL.
- URL shape: `/unsubscribe/${userId}?token=${hmacToken}` (or a time-limited signed JWT).
- On POST, verify the token before setting `unsubscribed = true`.
- The current URL shape in email content (`${getServerUrl()}/unsubscribe/${userId}`) MUST
  change to include the token.

---

### 2.7 Admin batch email route

#### `apps/web/src/routes/api.admin.send-email.ts`
- `POST /api/admin/send-email` protected by `adminRoute` (requires `user.role === "admin"`).
- Body schema: `{ subject: string (min 1), preview: string (min 1), markdown: string (min 1) }`.
- Fires `inngest.send({ name: "marketing/batch-email", data: { subject, subheadline: preview, markdown } })`.
- Response: `{ success: true }`.

#### `apps/web/src/routes/admin.send-email.tsx` (admin UI page)
- Shows count of eligible users (non-unsubscribed, email not null).
- Uses `getMarketingEligibleUsersCount()` which does `prisma.user.findMany({ where: { unsubscribed: false } })` then filters null emails.
- Only admin role can access this page.

---

## 3. Convex target files and function signatures

### 3.1 `convex/email/mutations.ts`
```
"use node" NOT required — uses @convex-dev/resend component
```
- `internal.email.mutations.sendEmail` — `internalMutation`
  - Args: `{ to: v.string(), subject: v.string(), html: v.string(), from?: v.optional(v.string()), replyTo?: v.optional(v.string()) }`
  - Calls `resend.sendEmail(ctx, { from: a.from ?? FROM, to, subject, html, replyTo: replyTo ?? HELP_EMAIL })`.
  - `FROM` constant = `"Melvyn from SaveIt.now <help@re.saveit.now>"` (from `RESEND_EMAIL_FROM` env).
  - `HELP_EMAIL` constant = `"help@saveit.now"` (from `HELP_EMAIL` env).

### 3.2 `convex/email/actions.tsx`
```
"use node" REQUIRED — renders React Email templates (JSX, Node built-ins)
```
- `internal.email.actions.sendMarkdownEmail` — `internalAction`
  - Args: `{ to: v.string(), subject: v.string(), markdown: v.string(), preview?: v.optional(v.string()), from?: v.optional(v.string()), disabledSignature?: v.optional(v.boolean()) }`
  - Renders `MarkdownEmail` component (imported from `emails/markdown.emails.tsx`).
  - Calls `ctx.runMutation(internal.email.mutations.sendEmail, { to, subject, html, from })`.

- `internal.email.actions.sendMarketingEmail` — `internalAction`
  - Args: `{ userId: v.id("users"), to: v.string(), subject: v.string(), text: v.string(), preview: v.optional(v.string()) }`
  - Fetches user from `betterAuth/data.ts` (or `ctx.db.get(userId)`) to check `unsubscribed`.
  - If `unsubscribed === true`, logs and returns early (does NOT throw, to allow scheduler chains to continue gracefully rather than crash the entire sequence).
  - Appends tokenised unsubscribe link to `text` (see B13 below).
  - Calls `internal.email.actions.sendMarkdownEmail`.

### 3.3 `convex/marketing/emailTemplates.ts`
- Pure TypeScript module exporting all the `EMAILS.*` string constants and factory functions.
- Must be importable from Node actions.
- `SITE_URL` from `process.env.SITE_URL` replaces `getServerUrl()`.
- APP_LINKS constants hard-coded identically to current values.

### 3.4 `convex/marketing/drips.ts`
```
"use node" NOT required — scheduler calls, DB reads only
```
All drip entry-points are `internalAction` (they call `sendMarketingEmail` which is an action):

- `internal.marketing.drips.startNewSubscriberDrip`
  - Args: `{ userId: v.id("users") }`
  - Immediately calls `sendMarketingEmail` for welcome email.
  - Schedules `internal.marketing.drips.newSubscriberStep2` after 2h.

- `internal.marketing.drips.newSubscriberStep2`
  - Args: `{ userId: v.id("users") }`
  - Checks bookmark count.
  - If 0: sends Chrome extension email, then schedules `step3` after 24h.
  - If > 0: schedules `step3` after 0ms (immediately, or a nominal short delay).

- `internal.marketing.drips.newSubscriberStep3`
  - Args: `{ userId: v.id("users") }`
  - Sends HOW_USE_CHROME_EXTENSION_EMAIL.
  - Schedules `step4` (import tips) after 24h.

- `internal.marketing.drips.newSubscriberStep4`
  - Args: `{ userId: v.id("users") }`
  - Sends HOW_TO_IMPORT_BOOKMARKS_EMAIL.
  - Schedules `step5` (usage check) after 24h.

- `internal.marketing.drips.newSubscriberStep5`
  - Args: `{ userId: v.id("users") }`
  - Checks bookmark count.
  - If < 10: sends HOW_TO_USE_BOOKMARKS_EMAIL, schedules `step6` after 24h.
  - If >= 10: schedules `step6` after 0ms.

- `internal.marketing.drips.newSubscriberStep6`
  - Args: `{ userId: v.id("users") }`
  - Sends HOW_TO_SEARCH_BOOKMARKS_EMAIL.
  - Schedules `step7` (premium pitch) after 24h.

- `internal.marketing.drips.newSubscriberStep7`
  - Args: `{ userId: v.id("users") }`
  - Sends PREMIUM_COMMITMENT_EMAIL.

- `internal.marketing.drips.startSubscriptionDrip`
  - Args: `{ userId: v.id("users") }`
  - Sends SUBSCRIPTION_THANK_YOU_EMAIL.
  - Schedules `subscriptionStep2` after 24h.

- `internal.marketing.drips.subscriptionStep2`
  - Sends SUBSCRIPTION_HOW_TO_USE_PREMIUM_EMAIL.
  - Schedules `subscriptionStep3` after 24h.

- `internal.marketing.drips.subscriptionStep3`
  - Sends SUBSCRIPTION_LETS_TALK_EMAIL.
  - Schedules `subscriptionStep4` after 24h.

- `internal.marketing.drips.subscriptionStep4`
  - Sends SUBSCRIPTION_OUR_COMMITMENT_EMAIL.

- `internal.marketing.drips.startLimitReachedDrip`
  - Args: `{ userId: v.id("users") }`
  - Guard: read `user.metadata.limitEmailSentAt` — if set, return immediately (idempotency).
  - Creates Stripe promo code (via `internal.marketing.drips.createPromoCode` internalAction).
  - Sends LIMIT_REACHED_DISCOUNT_EMAIL(promoCode).
  - Sets `metadata.limitEmailSentAt` (via `betterAuth/data.patchUser`).
  - Schedules `limitReachedStep2` after 24h, passing `promoCode`.

- `internal.marketing.drips.limitReachedStep2`
  - Args: `{ userId: v.id("users"), promoCode: v.string() }`
  - Sends LIMIT_REACHED_REMINDER_EMAIL(promoCode).
  - Schedules `limitReachedStep3` after 24h.

- `internal.marketing.drips.limitReachedStep3`
  - Args: `{ userId: v.id("users"), promoCode: v.string() }`
  - Sends LIMIT_REACHED_LAST_CHANCE_EMAIL(promoCode).

- `internal.marketing.drips.createPromoCode` — `internalAction` with `"use node"`
  - Creates the Stripe promo code (requires `stripe` SDK + Node).
  - Returns the code string.

### 3.5 `convex/marketing/batch.ts`
```
"use node" NOT required for orchestration; individual send is an action
```
- `internal.marketing.batch.sendBatchEmail` — `internalAction` (admin-triggered)
  - Args: `{ subject: v.string(), subheadline: v.string(), markdown: v.string() }`
  - Paginates eligible users (`unsubscribed: false`, non-null email) in batches of 100
    using Convex `.paginate()` (never unbounded `.collect()`).
  - For each batch: calls `internal.email.actions.sendMarkdownEmail` per user in parallel
    (or schedules each send individually to stay within Convex action limits).
  - Adds 1-second delay between batches.
  - Triggered by an admin Convex `authMutation` that calls `ctx.scheduler.runAfter(0, ...)`.

### 3.6 `convex/http.ts` — unsubscribe HTTP action
- `POST /unsubscribe` — `httpAction`
  - Accepts: `{ userId: string, token: string }` (from body or query params).
  - Verifies HMAC token: `HMAC-SHA256(BETTER_AUTH_SECRET, userId + ":" + timestamp)`.
  - Validates token has not expired (e.g. 30-day window).
  - If valid: calls `internal.betterAuth.data.patchUser(userId, { unsubscribed: true })`.
  - Returns `{ success: true }` or appropriate error.
  - NOTE: also consider exposing this as a Convex mutation callable from the frontend for
    users who are logged in (they can unsubscribe without a token).

### 3.7 `convex/marketing/queries.ts`
- `internal.marketing.queries.getEligibleUsersPage` — `internalQuery`
  - Returns paginated users with `unsubscribed: false` and non-null email.
  - Used by the batch action.

---

## 4. Trigger wiring

| Current trigger | Location | Convex equivalent |
|-----------------|----------|-------------------|
| `inngest.send("user/new-subscriber")` | `apps/web/src/lib/auth.ts` databaseHooks.user.create.after | `ctx.scheduler.runAfter(0, internal.marketing.drips.startNewSubscriberDrip, { userId })` in Convex `auth/hooks.onUserCreated` |
| `inngest.send("user/subscription")` | `apps/web/src/lib/auth/stripe/auth-plans.ts` onSubscriptionComplete | `ctx.scheduler.runAfter(0, internal.marketing.drips.startSubscriptionDrip, { userId })` in Stripe webhook handler (Phase 09) |
| `inngest.send("marketing/email-on-limit-reached")` | `apps/web/src/lib/database/bookmark-validation.ts` | `ctx.scheduler.runAfter(0, internal.marketing.drips.startLimitReachedDrip, { userId })` in bookmark creation/validation mutation (Phase 05) |
| `inngest.send("marketing/batch-email")` | `apps/web/src/routes/api.admin.send-email.ts` | `ctx.scheduler.runAfter(0, internal.marketing.batch.sendBatchEmail, { ... })` in an admin-protected Convex mutation |

---

## 5. Validation rules, guards, and security

### 5.1 Unsubscribe guard (every marketing send)
- Before any marketing email is sent, check `user.unsubscribed === true`.
- Source: `sendMarketingEmail` in `send-marketing-email.ts`.
- In Convex: `internal.email.actions.sendMarketingEmail` must re-read the user before sending.
- Drip sequences should handle `unsubscribed` gracefully by returning early (not crashing the
  scheduler chain) so subsequent steps don't run.

### 5.2 Limit-reached idempotency
- `metadata.limitEmailSentAt` (ISO string) must be set after the first email in the
  limit-reached drip is sent.
- Pre-trigger check in `bookmark-validation` equivalent: call `hasLimitEmailBeenSent` before
  scheduling. If set, skip.
- The Inngest-level `idempotency: "event.data.email"` has no direct Convex equivalent — the
  DB flag is the sole guard.

### 5.3 Unsubscribe link security (Phase 17 B13) — MUST FIX
- Current implementation is INSECURE: bare `userId` in URL, no authentication.
- Anyone who knows a `userId` can unsubscribe that user without consent.
- Convex replacement: generate HMAC-SHA256 token at email-send time, include in URL.
- Token verification must happen server-side before setting `unsubscribed = true`.
- Existing unsubscribe URLs in already-delivered emails will NOT work after migration (tokens
  will be missing). Decision needed: provide a grace period or a fallback auth-gated path.

### 5.4 Admin-only batch trigger
- `POST /api/admin/send-email` is gated by `adminRoute` (`user.role === "admin"`).
- Convex equivalent: use `requireAdmin` in the triggering mutation.

### 5.5 Concurrency / deduplication
- New-subscriber drip: one run per user — enforce via `userId` in scheduler (Convex
  scheduler is not inherently deduplicated; track with a `metadata` flag or scheduled-job
  table if double-send is a concern).
- Subscription drip: same — one per user per upgrade event.
- Limit-reached drip: idempotency guaranteed by `metadata.limitEmailSentAt` DB flag.

---

## 6. External API calls

### 6.1 Resend (via `@convex-dev/resend`)
- Component: `Resend` from `@convex-dev/resend`.
- Instantiation: `new Resend(components.resend, { testMode: false })`.
- `sendEmail(ctx, { from, to, subject, html, replyTo? })`.
- Env vars in Convex deployment: `RESEND_API_KEY`, `RESEND_EMAIL_FROM`, `HELP_EMAIL`.
- Verified sender domain: `re.saveit.now` (subdomain on Resend).

### 6.2 Stripe (promo code creation)
- SDK: `stripe` (via `stripeClient`).
- Method: `stripeClient.promotionCodes.create(...)`.
- Env vars: `STRIPE_SECRET_KEY`, `STRIPE_COUPON_ID`.
- Params (exact):
  - `coupon`: `env.STRIPE_COUPON_ID` (pre-created Stripe coupon object ID).
  - `code`: 6-char `nanoid(6).toUpperCase()`.
  - `max_redemptions`: 1.
  - `expires_at`: `dayjs().add(3, "days").unix()`.
  - `customer`: `user.stripeCustomerId ?? undefined`.
  - `active`: true.
  - `restrictions.first_time_transaction`: true.
- Requires `"use node"` in the action file.

---

## 7. Database fields involved

### User table (Convex `betterAuth` component schema)
- `unsubscribed: boolean` (default `false`) — marketing opt-out flag.
- `metadata: v.optional(v.any())` — JSON blob.
  - `metadata.limitEmailSentAt: string (ISO)` — idempotency flag for limit-reached drip.
  - `metadata.customLimits: object` — override per-user plan limits (not directly email-related).
- `stripeCustomerId: string` — used when creating promo codes.
- `email: string` — send target.

---

## 8. Development / playwright guard

Current `sendEmail` skips actual sending when `to` starts with `"playwright-test-"`, returning
a mock `nanoid()` id. This guard must be reproduced in `internal.email.actions.sendMarkdownEmail`
and/or `internal.email.mutations.sendEmail` in Convex. Check `to.startsWith("playwright-test-")`
before calling `resend.sendEmail`.

Also: in `NODE_ENV === "development"`, prepend `[DEV]` to subject. Convex uses `process.env.NODE_ENV`
in Node actions — this works with `"use node"`.

---

## 9. Unsubscribe page / front-end

### Current pages
- `GET /unsubscribe/:userId` — TanStack route, SSR loader reads user, shows confirmation form.
- `POST /api/unsubscribe/:userId` — bare endpoint, no auth.

### Convex target
- The unsubscribe page URL in emails becomes `/unsubscribe/:userId?token=<signed>`.
- Front-end page reads `userId` + `token` from URL params.
- On confirmation button click, calls a Convex HTTP action or public mutation with `(userId, token)`.
- Server verifies token HMAC, flips `unsubscribed = true`.
- Alternative for authenticated users: expose a Convex `authMutation` that sets `unsubscribed = true`
  for the currently authenticated user (no token needed).

---

## 10. Edge cases and gotchas

1. **Duplicate welcome drip**: If `onUserCreated` fires twice (rare, but possible on retry),
   two drip chains start. Mitigate with a `metadata.newSubscriberDripStartedAt` flag similar
   to `limitEmailSentAt`.

2. **User deletion during drip**: A scheduled step runs after the user was deleted. The
   `sendMarketingEmail` action will fail to find the user. It must handle `user === null`
   gracefully (log and return, do not throw).

3. **Step id collision in new-subscriber drip**: The current Inngest code uses
   `"wait-24h-after-extension"` as step id in BOTH step 6 (after extension nudge) and step 8
   (after extension how-to). Inngest deduplicates by step id within a run so the second sleep
   is effectively a no-op if the first ran. In Convex, since each step is a separately
   scheduled function, this is not an issue — use distinct scheduler calls.

4. **Conditional delay accumulation**: When the Chrome extension email is skipped (user has
   bookmarks), the total time from welcome to HOW_USE_CHROME_EXTENSION is 2h (not 2h + 24h).
   When the usage tips email is skipped (bookmark count >= 10), the total time from import
   email to search email is 24h (not 48h). Implement correctly in the step functions.

5. **`SITE_URL` in email links**: Convex actions have no `window.location` and no
   `VERCEL_URL`/`PLAYWRIGHT_TEST_BASE_URL`. Must use `process.env.SITE_URL` consistently.
   Set `SITE_URL=https://saveit.now` in the Convex deployment env vars.

6. **`MarkdownEmail` signature appended automatically**: The current template appends
   `\n\nBest,\n\nMelvyn from SaveIt.now` unless `disabledSignature: true`. All drip sequences
   do NOT pass `disabledSignature`, so the signature is always appended. Preserve this.

7. **Batch email uses `sendEmail` not `sendMarketingEmail`**: The batch job bypasses
   `sendMarketingEmail`'s unsubscribe guard, relying instead on the eligibility query
   (`unsubscribed: false`). This is intentional but means a user who unsubscribes after the
   query but before their batch arrives still receives the email. Preserve this behaviour.

8. **Promo code text says "2 days" but expires in 3 days**: Pre-existing inconsistency in the
   `LIMIT_REACHED_DISCOUNT_EMAIL` template body. Do NOT "fix" this — reproduce it verbatim.

9. **Stripe `stripeCustomerId` may be null**: When creating the promo code, `customer` is
   `user.stripeCustomerId ?? undefined`. If the user never got a Stripe customer ID, the promo
   is not customer-tied. Handle gracefully.

10. **`@convex-dev/resend` queuing behaviour**: The component queues and retries sends. Be
    aware that very long drips (7+ days total) will have scheduled Convex jobs persisted for
    that duration. Convex scheduler supports arbitrarily long delays; this is fine.

---

## 11. Env var mapping

| Current var | Convex deployment var | Notes |
|-------------|----------------------|-------|
| `RESEND_API_KEY` | `RESEND_API_KEY` | Set via `npx convex env set` |
| `RESEND_EMAIL_FROM` | `RESEND_EMAIL_FROM` | Default: `"Melvyn from SaveIt.now <help@re.saveit.now>"` |
| `HELP_EMAIL` | `HELP_EMAIL` | Default: `"help@saveit.now"` |
| `STRIPE_COUPON_ID` | `STRIPE_COUPON_ID` | Pre-created Stripe coupon object ID |
| `STRIPE_SECRET_KEY` | `STRIPE_SECRET_KEY` | Already covered in Phase 09 |
| `getServerUrl()` (dynamic) | `SITE_URL` | Static `https://saveit.now` in prod |
| `BETTER_AUTH_SECRET` | `BETTER_AUTH_SECRET` | Used for HMAC token signing (B13) |

---

## 12. Files to DELETE after migration

- `apps/web/src/lib/mail/resend.ts`
- `apps/web/src/lib/mail/send-email.ts`
- `apps/web/src/lib/mail/send-marketing-email.ts`
- `apps/web/src/lib/inngest/marketing/emails.const.ts`
- `apps/web/src/lib/inngest/marketing/marketing-emails-on-new-subscriber.job.ts`
- `apps/web/src/lib/inngest/marketing/marketing-emails-on-subscription.job.ts`
- `apps/web/src/lib/inngest/marketing/marketing-emails-on-limit-reached.job.ts`
- `apps/web/src/lib/inngest/marketing/batch-marketing-email.job.ts`
- `apps/web/src/lib/database/marketing-users.ts` (replaced by Convex query)
- `apps/web/src/lib/database/user-metadata.utils.ts` (merged into `betterAuth/data.ts`)
- `apps/web/src/routes/api.unsubscribe.$userId.ts` (replaced by HTTP action + signed token)

Keep and port:
- `apps/web/emails/email-layout.tsx` → `packages/backend/convex/email/emailLayout.tsx`
- `apps/web/emails/markdown.emails.tsx` → `packages/backend/convex/email/markdownEmail.tsx`

---

## 13. Acceptance criteria (from Phase 10)

- OTP and magic-link transactional emails arrive via Resend component.
- A new signup triggers the welcome drip with the correct 2h → 24h cadence; conditional steps
  (extension nudge, usage tips) are skipped/included based on live bookmark count at step time.
- Upgrading to pro triggers the 4-email subscription drip at 1d cadence.
- Hitting the free bookmark limit triggers the limit-reached drip with a valid Stripe promo
  code; `metadata.limitEmailSentAt` is set so the drip only fires once per user.
- A user with `unsubscribed: true` does not receive any drip or batch email.
- The unsubscribe URL contains a signed token; bare `userId` unsubscribe is rejected.
- Admin can trigger a batch marketing campaign via the admin UI; emails are sent to all
  non-unsubscribed users in batches of 100 with 1-second inter-batch delay.
