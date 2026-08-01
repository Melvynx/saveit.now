---
name: ns-analytics
description: Integrate or audit privacy-safe PostHog analytics across NowStack Mobile Expo and TanStack web surfaces. Use for event design, consent, identity, dev/prod separation, funnels, feature flags, or analytics verification.
---

# Analytics - NowStack Mobile

<objective>
Produce a small, stable, privacy-safe event model shared by mobile and web, then prove events in the intended PostHog project without leaking sensitive data.
</objective>

<required_reads>
Read `mobile-app/lib/posthog.ts`, mobile root providers, web root/router providers, `site-config.ts`, onboarding/auth/payment owners, and the privacy/legal copy before editing. Use current official PostHog Expo and web docs when SDK behavior is uncertain.
</required_reads>

<invariants>
- Public project keys may live in platform public env; personal API keys never do.
- Development, preview, and production are visibly separated by project or mandatory environment property.
- Never capture raw email, OTP, token, free text, user content, payment data, file names, or secrets.
- Identify only after authentication with a stable opaque product id; reset on sign-out/account switch.
- Consent and opt-out behavior match the product's jurisdictions and privacy copy.
- Autocapture/session replay are off until explicitly justified and scrubbed on both surfaces.
</invariants>

<workflow>
1. Define an event dictionary from product questions, not screens: `onboarding_started`, `onboarding_completed`, `sign_in_succeeded`, `paywall_viewed`, `purchase_succeeded`, and domain activation events. Define allowed properties and owner for each.
2. Reuse `mobile-app/lib/posthog.ts`; add a parallel web helper only if absent. Do not call SDKs directly from random components.
3. Gate initialization/capture on configured key and consent. Keep missing analytics non-fatal.
4. Wire identify/reset and page/screen context consistently across Expo Router and TanStack Router.
5. Verify one anonymous, one authenticated, one conversion, one opt-out, and one sign-out/reset path in the provider live debugger. Inspect payloads for forbidden PII and correct environment.
6. Update privacy/store declarations if collection materially changes.
</workflow>

<report>
Return the event dictionary, changed owners, consent behavior, provider read-back, rejected PII fields, and any production state that is `NOT VERIFIABLE`.
</report>
