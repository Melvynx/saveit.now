---
name: ns-ios-audit
description: Audit a NowStack Mobile iOS app against the App Store Review Guidelines before submission - account deletion, IAP/Restore + no Stripe on iOS, Sign in with Apple parity, permission strings, App Privacy, AI disclosure, export compliance. Use for "ns ios audit" or "will my app pass App Store review".
---

# iOS App Store Compliance Audit - NowStack Mobile

Read the code, decide which App Store Review Guidelines actually apply to THIS app's feature set, check each one against the real files, and produce a clean report that tells the user exactly what to fix before submission. This is **read-only by default** — audit and report. Only fix code if the user asks.

<objective>
Catch the rejections that App Review would catch, before the build is submitted. The output is a triaged report: each guideline marked PASS / BLOCKER / WARNING / MANUAL-GATE / N/A, every finding tied to a concrete file:line, and a copy-pasteable fix. The full guideline catalog with the why + fix per item lives in `references/guidelines.md` — read it before writing findings; do not re-derive guideline numbers from memory.
</objective>

<critical>
- **Scope to the app's actual features.** Many guidelines (UGC 1.2, subscriptions 3.1.2, ATT, AI disclosure) only apply if the code uses that capability. Detect first (Phase 1), then only audit what applies. Marking an irrelevant guideline "N/A — app has no X" is a correct, valuable result.
- **Ground every finding in a real file.** No finding without a `path:line`. If you can't point at code, it's a MANUAL-GATE, not a code finding.
- **Read-only.** Do not edit code, change `site-config.ts`, or run store mutations. Recommend fixes; let the user run `/ns ios distribute` or implement.
- This is the pre-flight before `ns-ios-distribute`. A clean audit ≠ a passed review (the App Privacy questionnaire and live web URLs are manual gates), but it removes the predictable rejections.
</critical>

<phase n="1" title="Detect what the app actually does">
Run these greps from repo root to learn the feature set — the results decide which guidelines apply.

```bash
# Payment model: apple_iap vs stripe on iOS, one-time vs subscription
grep -nE "providers:|ios:|entitlementKey|priceDisplay" site-config.ts
grep -rnE "stripe|createCheckoutSession|Linking.openURL" mobile-app/app/\(flow\)/paywall.tsx
grep -rniE "restore|getAvailablePurchases" mobile-app/app mobile-app/lib/iap.ts

# Auth providers (4.8 Sign in with Apple parity)
grep -nE "enableAppleSignIn|enableGoogleSignIn|enable.*SignIn" site-config.ts
grep -nE "getEnabledAuthProviders|apple|google" convex/auth.ts

# Account deletion (5.1.1v)
grep -rniE "delete.?account|anonymize" mobile-app/app convex/users

# Apple review demo account — static-OTP login so the reviewer can sign in (2.1)
grep -nE "appstoretest@email.com|generateOTP|sendVerificationOTP|123456" convex/auth.ts

# Permissions / Info.plist (5.1.1i + export compliance)
grep -nE "Permission|UsageDescription|ITSAppUsesNonExemptEncryption|privacyManifest" mobile-app/app.config.ts

# AI / generative models (disclosure + moderation) — usually ZERO hits here
grep -rniE "anthropic|openai|@anthropic-ai|claude|gpt-|replicate|huggingface|generateText|streamText|ai/react" convex mobile-app/lib mobile-app/app

# Tracking / ATT — first-party analytics needs NO ATT
grep -rniE "idfa|adsupport|requestTrackingAuthorization|NSUserTracking" mobile-app
grep -nE "posthog|capture|identify" mobile-app/lib/posthog.ts

# UGC: is another user's content ever shown cross-user? (1.2)
grep -rniE "report|block|moderat" mobile-app/app
# + scan convex/ for queries returning other users' uploaded content

# Data inventory for App Privacy labels (5.1.2)
sed -n '1,60p' convex/schema.ts

# Privacy / terms / support URLs (5.1.1, 1.5)
grep -nE "privacy|terms|website|email" site-config.ts
```

Note for each: present / absent / placeholder. A placeholder URL or `easProjectId`/`appStore` id still at the boilerplate default is itself a finding.
</phase>

<phase n="2" title="Map findings to guidelines">
Open `references/guidelines.md` and walk every section. For each, use the Phase 1 evidence to decide the verdict. Read the actual file (not just the grep line) before calling anything PASS — e.g. confirm the iOS paywall branch truly avoids Stripe, confirm the delete-account screen is linked from settings, confirm permission strings name the feature.

The non-negotiable BLOCKER set for this boilerplate:
1. **3.1.1** — iOS purchases via Apple IAP only, no external payment link, **Restore Purchases present**.
2. **3.1.2** — if the IAP is a subscription: auto-renew disclosure + Terms + Privacy links on the paywall.
3. **4.8** — if Google (or any social) sign-in is on for iOS, Apple Sign In must be on too.
4. **5.1.1(v)** — in-app account deletion, reachable, actually deletes/anonymizes.
5. **5.1.1(i)** — every requestable permission has a specific purpose string; no unused permissions declared.
6. **5.1.1** — privacy + terms URLs real and the web app deployed (privacy/terms are review gates).
7. **Export compliance** — `ITSAppUsesNonExemptEncryption` declared.
8. **2.1** — dev payment bypass off in the submitted build, **plus a working Apple review demo account**. The reviewer must be able to sign in: the boilerplate ships a static-OTP account in `convex/auth.ts` (`generateOTP` returns `"123456"` for `appstoretest@email.com`; `sendVerificationOTP` short-circuits so no real email is needed). Verify BOTH code paths are intact AND that the same credentials are entered in App Store Connect → App Review Information (manual gate). A signed-in app with no reviewer login is an automatic rejection ("we were unable to sign in").

Conditional (only if Phase 1 found the trigger): 1.2 UGC, AI disclosure, ATT, privacy manifest for custom native deps.
</phase>

<phase n="3" title="Report">
Output exactly this shape. Lead with the verdict line so the user knows in one glance whether they can submit.

```
## iOS App Store Audit — {SiteConfig.title} ({bundleId} v{version})

VERDICT: ❌ N blockers / ⚠️ M warnings / 🔒 K manual gates   (or: ✅ Ready to submit — only manual gates remain)

### ❌ Blockers (fix before submit)
- [3.1.1] No Restore Purchases on iOS — paywall.tsx has no restore handler.
  Fix: add a "Restore Purchases" action calling expo-iap getAvailablePurchases, reachable from the paywall/settings.

### ⚠️ Warnings (verify these apply to you)
- [4.8] Google sign-in enabled — Apple Sign In is also on ✓, but confirm APPLE_CLIENT_ID/SECRET are set on the prod Convex deployment.

### 🔒 Manual gates (you must do these — not provable from code)
- App Privacy questionnaire (web-only): https://appstoreconnect.apple.com/apps/{asc_app_id}/distribution/privacy
  Declare: Contact Info (email, linked to identity), User Content, Usage Data — NOT used for tracking.
- Privacy policy + terms web pages must be LIVE before submit: {urls.privacy}, {urls.terms}

### ✅ Passing
- [5.1.1v] Account deletion — delete-account.tsx → anonymizeAccount() in convex/users/account.ts ✓
- [export] ITSAppUsesNonExemptEncryption: false ✓

### N/A (feature not present)
- [1.2 UGC] No cross-user content. [AI disclosure] No LLM/model usage in repo.
```

Rules for the report:
- Every code finding cites `path:line`. Manual gates cite the App Store Connect URL or the live web URL.
- Each blocker/warning gets a one-line, concrete fix (what file, what to add).
- End with the single next action: if blockers → "fix blockers, then re-run this audit"; if only manual gates → "clear the manual gates, then run `/ns ios distribute`".
</phase>

<failure_modes>
- **Calling Stripe-on-iOS a pass because the file imports Stripe.** The repo ships Stripe for *web/Android*; the violation only exists if the **iOS branch** of the paywall reaches it. Read the `Platform.OS` branching before judging.
- **Flagging PostHog as ATT-required.** First-party product analytics is not cross-app tracking; no ATT prompt needed — but it still must be declared in App Privacy as Usage Data (not for tracking).
- **Inventing an AI-disclosure blocker.** This boilerplate has no model usage; only raise it if Phase 1 greps actually hit an AI SDK.
- **Treating the App Privacy questionnaire as a code fix.** It is web-only; always a MANUAL-GATE with the exact declarations, never marked PASS from code.
- **Marking privacy/terms PASS because the URL exists in config.** The URL must resolve (web app deployed); a configured-but-dead URL is still a blocker.
</failure_modes>

<success_metrics>
- Every applicable guideline in `references/guidelines.md` has a verdict; inapplicable ones are explicitly N/A with the reason.
- Zero findings without a `path:line` or a manual-gate URL.
- The 8 non-negotiable BLOCKERs are each explicitly checked.
- The report opens with a one-line submit/no-submit verdict and ends with one next action.
</success_metrics>
</content>
