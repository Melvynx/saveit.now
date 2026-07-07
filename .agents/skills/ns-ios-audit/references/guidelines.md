# App Store Review Guideline Catalog — NowStack Mobile

Each entry: the guideline, why apps get rejected for it, the exact check against THIS repo, and the fix. Severity:

- **BLOCKER** — Apple rejects on this. Must be green before submit.
- **WARNING** — common rejection if the app's feature set triggers it; verify it applies.
- **MANUAL-GATE** — cannot be proven from code; a human must do it in App Store Connect / a browser. Report the link + exact answer.

`{...}` placeholders come from `site-config.ts`.

---

## 1.2 — User-Generated Content (UGC)

**Triggers only if the app lets users create/post content others can see** (R2 uploads shown to other users, comments, profiles). Pure single-user content does NOT trigger it.

Apple requires, for UGC apps: (a) a EULA/terms, (b) a method to filter objectionable content, (c) a mechanism to **report** offensive content, (d) the ability to **block** abusive users, (e) published contact info for reports, (f) act on reports within 24h.

- **Check:** does any Convex query return another user's uploaded content to a different user? Grep `convex/` for cross-user reads of `storage`/user content tables. Inspect `convex/storage/r2.ts` consumers.
- **Fix if triggered:** add report + block UI on any screen showing other users' content, and a moderation path. If content is single-user only, mark **N/A** and say why.

## 1.5 — Developer / Support Information

App must have a working support URL or contact. Review checks the support email/URL resolves.

- **Check:** `site-config.ts` → `company.email` and `urls.website`/support route. Settings screen surfaces it (`mobile-app/app/(app)/(tabs)/settings.tsx`).
- **Fix:** real reachable email, not a placeholder `support@nowstack.app`. Web `/support` route must be live.

---

## 2.1 — App Completeness

No crashes, no broken links, no placeholder content, and a **working demo account** so the reviewer can see everything behind auth.

- **Check:** no `TODO`/`Lorem`/"Coming soon" in shipped screens. Paywall renders a real price (`SiteConfig.payment.priceDisplay`), not a dev-bypass button.
- **Fix:** seed demo data; ensure `EXPO_PUBLIC_ALLOW_DEV_PAYMENT_BYPASS` is false in the submitted build.

### 2.1 — Apple review demo account (static-OTP login) — BLOCKER

The single most common hard rejection for an auth-gated app: **"We were unable to sign in to review your app."** Apple's reviewer is not on your allowlist and cannot receive your OTP email, so the app MUST ship a fixed test account they can sign in with. NowStack bakes this into the auth layer so it works on every deployment without any email infrastructure:

- `convex/auth.ts` → `emailOTP` plugin:
  - `generateOTP({ email })` returns the constant `"123456"` when `email === "appstoretest@email.com"`.
  - `sendVerificationOTP({ email })` **short-circuits (returns early)** for that same email, so no Resend/email send is attempted — the reviewer types the email, then `123456`, and they're in.
- **Check (code):** both branches are present and reference the SAME email + code. A common breakage: someone renames the email or removes the `generateOTP` constant but App Store Connect review notes still say `appstoretest@email.com` → reviewer locked out. Grep `convex/auth.ts` for `appstoretest@email.com`, `123456`, `generateOTP`, `sendVerificationOTP`.
- **Check (reachability):** the sign-in screen exposes the email-OTP path (it does — `mobile-app/app/onboarding/sign-in-form.tsx`), so the reviewer can actually use it without Apple/Google sign-in.
- **MANUAL-GATE (App Store Connect):** the credentials must also be entered under **App Review Information** (`appStoreReviewDetails`: `demoAccountName: appstoretest@email.com`, `demoAccountPassword: 123456`, `demoAccountRequired: true`) with a note explaining the OTP flow — *"Sign in with the email OTP flow: enter appstoretest@email.com, the one-time code is fixed to 123456 for this account."* `ns-ios-distribute` Phase F sets this; the audit only confirms the code side and reminds about the manual entry.
- **Fix if missing:** restore the two `email === "appstoretest@email.com"` branches in `convex/auth.ts`; never gate them behind an env var (they must work in the production build the reviewer downloads).
- **Security note:** this is intentional and safe — it's a fixed code for one known email, not a backdoor for arbitrary accounts. Keep it scoped to exactly that address; do not broaden it.

## 2.3.1 / 2.5.1 — No hidden features, public APIs only

No code that reveals/enables features after review; no private API use.

- **Check:** no feature flag that flips behavior based on a remote kill-switch in a way reviewers can't see; no private-symbol usage. Grep for dynamic `require`/remote-config gating of core features.

## 2.3.10 — Metadata must not reference other platforms

App name, description, screenshots must not mention "Android", "Google Play", "Web version", etc.

- **Check:** scan `site-config.ts` copy + store metadata draft + screenshots for Android/web mentions.

---

## 3.1.1 — In-App Purchase (BLOCKER, the #1 rejection)

Digital goods/subscriptions unlocked inside the app **must** use Apple IAP on iOS. No Stripe/PayPal/external checkout on iOS. No buttons or links steering users to pay outside the app ("anti-steering"; US/EU link entitlements exist but the safe default is: don't link out).

- **Check (must all pass):**
  - `site-config.ts` → `payment.providers.ios` is `apple_iap` (NOT `stripe`).
  - `mobile-app/app/(flow)/paywall.tsx` — on `Platform.OS === 'ios'` it calls the IAP hook (`mobile-app/lib/iap.ts` / `expo-iap`), never Stripe. Grep the iOS branch for `stripe`, `createCheckoutSession`, `Linking.openURL` to an external payment page.
  - No "manage/upgrade on our website" link visible on iOS.
- **Check (restore):** there is a **Restore Purchases** action reachable on iOS (App Review explicitly requires it for non-consumables/subscriptions). Grep paywall + settings for a restore handler (`getAvailablePurchases`/`restorePurchases`). **If missing → BLOCKER.**
- **Fix:** route iOS purchases through `expo-iap`; add a Restore button; remove any external payment link from iOS UI.

## 3.1.2 — Subscriptions (only if the IAP is auto-renewing)

The paywall (and metadata) must disclose, before purchase: title, length, price per period, and that it auto-renews until cancelled. Must link **Terms of Use (EULA)** and **Privacy Policy** from the paywall. The app description must contain the Terms of Use link.

- **Check:** `site-config.ts` `payment.entitlementKey` — is it a one-time `lifetime` (3.1.1, simpler) or a subscription? If subscription, paywall must show the auto-renew disclosure text + Terms/Privacy links. Grep `paywall.tsx` for the privacy/terms links and renewal copy.
- **Fix if subscription:** add the standard auto-renew disclosure block and the two legal links to the paywall.

## 3.1.3(b) — Reader / multiplatform

If the same entitlement is sold on web (Stripe), the iOS app may let a user who already bought elsewhere access content, but must not *promote* the cheaper external purchase. Fine here because grant is unified server-side (`convex/payments/entitlements.ts`); just don't surface "buy on web, it's cheaper".

---

## 4.2 — Minimum Functionality

App must do enough to justify being an app (not a repackaged website). A signed-in product with real features clears this; an empty boilerplate does not.

- **Check:** the app ships at least one real, non-placeholder feature flow beyond auth + paywall.

## 4.8 — Login Services / Sign in with Apple (BLOCKER if it applies)

If the app uses any **third-party or social login** (Google, Facebook, etc.) as a login option, it must also offer a login service that meets Apple's privacy bar — Sign in with Apple, OR an equivalent that (a) limits data to name+email, (b) lets users keep email private, (c) doesn't track. **Email OTP with no third-party tracking generally satisfies the alternative**, but Sign in with Apple is the safe path on iOS.

- **Check:** read `convex/auth.ts` `getEnabledAuthProviders` + `site-config.ts` `features.enableGoogleSignIn` / `enableAppleSignIn`.
  - If `enableGoogleSignIn` is true on iOS → `enableAppleSignIn` MUST be true (and the Apple button shown, gated on `Platform.OS === 'ios'` in `sign-in-form.tsx`). Email-only OTP is the privacy-respecting alternative if no social login is enabled.
  - Verify the Apple button actually renders when the provider query returns `apple: true`.
- **Fix:** enable Apple Sign In + wire credentials (`APPLE_CLIENT_ID`/`APPLE_CLIENT_SECRET` on the Convex deployment), per `.agents/rules/auth-payments-storage.md`.

## 4.5.4 — Push notifications

Not required to use the app; no ads/marketing via push without opt-in.

- **Check:** if push is implemented, app works without granting it.

---

## 5.1.1(i) — Permission purpose strings (BLOCKER)

Every iOS permission the app can request needs a clear, specific `NS*UsageDescription` in `Info.plist`. Generic strings ("Allow access") get rejected; the string must say *why*.

- **Check:** for each Expo plugin in `mobile-app/app.config.ts` that needs a permission, confirm a meaningful purpose string:
  - `expo-image-picker` → camera + photos strings.
  - `expo-media-library` → photo save strings.
  - Any notifications / location / contacts / microphone plugin added later.
- **Check:** no permission declared that the app never uses (Apple rejects unused permissions). If `microphonePermission: false` etc., good — keep disabled what isn't used.
- **Fix:** rewrite vague strings to name the feature ("Used to attach a photo to your …").

## 5.1.1(v) — Account Deletion (BLOCKER)

Any app that supports **account creation** must let users **initiate account deletion from within the app** (not just deactivate, not "email us"). Must fully delete or anonymize the account + associated data.

- **Check:** `mobile-app/app/(app)/delete-account.tsx` exists and is reachable from settings; it calls the Convex mutation in `convex/users/account.ts` (`anonymizeAccount`). Confirm the settings screen links to it.
- **Check:** the deletion actually removes/anonymizes user data (email anonymized, content handled), not just sign-out.
- **Fix:** if missing or unreachable, add a Delete Account row in settings → confirmation → mutation.

## 5.1.1 / 5.1.2 — Privacy Policy + Data Use (BLOCKER + MANUAL-GATE)

A privacy policy URL is mandatory and must be live. The App Privacy "nutrition label" questionnaire in App Store Connect must accurately reflect what's collected.

- **Check (code):** `site-config.ts` `urls.privacy` + `urls.terms` are real, and the web app serving them is deployed. Privacy/terms links surfaced in app (sign-in form, settings).
- **Check (data inventory):** from `convex/schema.ts` + `mobile-app/lib/posthog.ts`, list everything collected: email, name, user content (R2), analytics events, device/usage data. This list IS the App Privacy answer.
- **MANUAL-GATE:** App Privacy questionnaire is web-only (`https://appstoreconnect.apple.com/apps/{asc_app_id}/distribution/privacy`). Baseline for this boilerplate: Contact Info (email) linked to identity; User Content; Identifiers; Usage Data (analytics) — **not used for tracking** if PostHog stays first-party. Report the exact declarations.

## 5.1.2 / ATT — App Tracking Transparency

If the app tracks the user across other companies' apps/sites (e.g. for ads, or sharing identifiers with a data broker), it must show the ATT prompt (`NSUserTrackingUsageDescription` + `requestTrackingAuthorization`) before tracking.

- **Check:** does analytics (`mobile-app/lib/posthog.ts`) or any SDK link IDFA / share data across apps? First-party PostHog analytics for your own product is NOT "tracking" and needs no ATT. Grep for `idfa`, `AdSupport`, `requestTrackingAuthorization`, ad SDKs.
- **Fix:** if tracking exists → add ATT prompt + usage string + declare it. If not → ensure App Privacy says "Data Not Used to Track You" and **don't** add a tracking string.

---

## Privacy Manifest — `PrivacyInfo.xcprivacy` (modern BLOCKER, 2024+)

Apple requires a privacy manifest declaring data collection + **"required reason API"** usage (e.g. `UserDefaults`, file timestamp, disk space, system boot time APIs). Missing/incorrect manifests now block uploads and trigger emails.

- **Check:** Expo SDK 50+ generates a baseline manifest, but confirm: does the prebuild config or any native dep need entries? Look for `ios.privacyManifests` in `app.config.ts`, or a checked-in `PrivacyInfo.xcprivacy`. Most Expo-managed deps are covered by Expo's defaults — flag if custom native code or a non-Expo SDK was added.
- **Fix:** add `ios.privacyManifests` to `app.config.ts` (Expo config plugin) declaring the required-reason API categories the deps use.

## Export Compliance — `ITSAppUsesNonExemptEncryption`

Standard HTTPS-only apps are exempt but must declare it, or every build prompts for export compliance.

- **Check:** `mobile-app/app.config.ts` `ios.infoPlist.ITSAppUsesNonExemptEncryption: false`. **Must be present.**
- **Fix:** add it if missing.

---

## Generative AI / Models — disclosure & moderation

**Only triggers if the app calls an LLM / image model / any generative AI.** Apple expectations when it does:

1. **Disclose** AI usage to the user (in-app + ideally App Store description) — content is AI-generated.
2. **Content moderation / safety filtering** on AI output if users can generate or see generated content (ties to 1.2).
3. **Age rating** typically must rise (often 17+) for unfiltered generative content.
4. Don't claim the AI does things it can't (2.3 accurate metadata).
5. If the model runs on a third-party API, that data flow must appear in the privacy policy + App Privacy.

- **Check:** grep the whole repo (`convex/` + `mobile-app/`) for AI SDKs/usage: `anthropic`, `@anthropic-ai`, `openai`, `claude`, `gpt-`, `replicate`, `huggingface`, `convex.*ai`, `generateText`, `streamText`, `ai/react`. **Currently NONE in this boilerplate.**
- **Report:** if zero hits → "No AI/model usage; AI disclosure rules N/A." If any hit → list the file + apply requirements 1–5 above and raise it as a WARNING the user must address before submit.

---

## Quick severity routing

| Finding | Severity |
| --- | --- |
| iOS sells digital goods via Stripe / external link | BLOCKER (3.1.1) |
| No Restore Purchases on iOS | BLOCKER (3.1.1) |
| No in-app account deletion | BLOCKER (5.1.1v) |
| Google sign-in on but Apple sign-in off | BLOCKER (4.8) |
| Vague/missing/unused permission string | BLOCKER (5.1.1i) |
| Missing `ITSAppUsesNonExemptEncryption` | BLOCKER (export) |
| Privacy/terms URL placeholder or web not deployed | BLOCKER (5.1.1) |
| Subscription paywall missing auto-renew + legal links | BLOCKER (3.1.2) |
| AI usage present but undisclosed/unmoderated | WARNING → BLOCKER if UGC-facing |
| UGC without report/block | BLOCKER (1.2) |
| App Privacy questionnaire | MANUAL-GATE |
| Privacy manifest for custom native dep | WARNING |
| Dev payment bypass enabled in build | BLOCKER (2.1) |
| Static-OTP review account broken/renamed in `convex/auth.ts` | BLOCKER (2.1) |
| Review demo account not entered in App Store Connect | MANUAL-GATE (2.1) |
</content>
</invoke>
