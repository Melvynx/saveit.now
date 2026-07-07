---
name: ns-setup-accounts
description: Connect every external account NowStack Mobile needs (Convex, Expo/EAS, Apple Developer, Vercel, Stripe, Google Play) by acquiring PROGRAMMATIC API ACCESS for each, then doing everything automatically through that access. Use for "setup accounts", "connect my accounts", first-run onboarding, or when check-setup reports CLI/auth gaps. The skill obtains a token/key per service, stores it in the right place, and only asks the user for the irreducible manual steps (browser signup, 2FA, one-time key download). Every account is skippable.
---

# Setup Accounts - NowStack Mobile

<objective>
Get programmatic control of every external service this product depends on, so the rest of the lifecycle (`/ns setup`, `web deploy`, `ios distribute`, `android distribute`) runs without the user ever touching a dashboard again.

The whole point of this skill is **API access, not hand-holding**. For each service the goal is one thing: obtain a credential the CLI/API can use (a token, a deploy key, a service-account JSON, an ASC `.p8`), persist it in the correct place, and verify it works. From that moment on, every action on that service is automated through the credential — `npx convex env set`, `vercel deploy`, `eas submit`, `asc ...` — never by clicking in the web UI.
</objective>

<core_principle>
Minimize what the user does to the **irreducible manual steps only** — the things a provider physically forces a human to do:
- the initial browser **signup** (email + payment + accepting terms),
- **2FA** / identity verification,
- downloading a **one-time secret** the provider only shows once (Apple `.p8`, Google service-account JSON),
- a permission **grant** that only exists in the web UI (e.g. inviting a service account in Play Console).

**Everything else, the skill does itself** via the acquired API access: creating tokens that CAN be created from the CLI, writing env vars, editing config, running deploys, validating. When you need the user, ask for exactly one thing, tell them the exact URL, and wait. Never say "go configure X somewhere" — either do it yourself with the credential, or ask for the single value and then write it.
</core_principle>

<rules>
- Drive state from `node scripts/check-setup.mjs --accounts`. Re-run after every change; an account is done only when its line reads `<service>|ready`.
- One account at a time. For each: acquire API access → store credential in its home → verify → automate the rest.
- **Credential homes (never mix these up):** backend secrets → Convex env (`npx convex env set`); production web secrets → Vercel (`vercel env add` / dashboard); mobile build/submit secrets → `eas.json` + EAS secrets; ASC `.p8` → `asc` config; Google service-account JSON → repo-ignored path referenced by `eas.json`. Public ids (`appleTeamId`, `easProjectId`) → `site-config.ts`. NEVER write a secret into a committed `.env`, `site-config.ts`, or docs.
- Prefer creating tokens **non-interactively** when the provider's CLI allows it (Convex deploy key, Vercel token via `vercel login`, EAS access token). Only fall back to "ask the user to create + paste" when the provider forces a web-only creation.
- Every account is **skippable**. Only Convex is required to run the app; the rest gate specific surfaces. If the user skips, record it and move on.
- After editing `site-config.ts`, mirror `title`/`slug`/`bundleId`/product ids into `convex/siteConfig.ts` (`npm run check-setup`). Use `trash`, never `rm -rf`.
</rules>

<start>
Probe what's already connected, then work only the gaps:

```bash
node scripts/check-setup.mjs --accounts
```

Parse the `service|status|hint` lines: `ready` = API access already obtained, skip; `todo` = acquire it now; `skip-ok` = optional, offer to skip. Ask the user up front which surfaces they ship (iOS? Android? web? payments?) so whole branches can be skipped. Then work the accounts in the order below.
</start>

<order>
Order by lead time, not importance — start the slow approvals first and keep going while they pend:

1. **Apple Developer** — first if shipping iOS; identity review can take 24–48h.
2. **Google Play** — second if shipping Android; identity review also takes days (the account may be "pending verification" — set up the API access now anyway so publishing is one command once approved).
3. **Convex** — required; the app won't run without it.
4. **Expo / EAS** — any mobile build.
5. **Vercel** — web app + admin.
6. **Stripe** — only if taking payments on web/Android (iOS uses Apple IAP).
7. **Social sign-in (Google / Apple OAuth)** — instant, do last; only for providers whose `SiteConfig.features.enable<Provider>SignIn` flag is on. Email-OTP needs none of this.
</order>

## Per-account playbooks

Each playbook follows the same spine: **acquire API access → store → verify → from now on, automated.**

<account name="Convex" cost="free" gates="everything (required)">
- **API access:** the Convex CLI auth token (created by `npx convex login`, stored in `~/.convex`) + a **production deploy key** for CI/Vercel.
- **Acquire:** run `npx convex dev` — opens the browser once for signup/login, creates the dev deployment, writes `CONVEX_DEPLOYMENT` to `.env.local`. For prod automation, ask the user to generate a production deploy key (Convex dashboard → Settings → Deploy keys); you'll hand it to Vercel as `CONVEX_DEPLOY_KEY` in the Vercel step.
- **Then automated:** all backend config is yours — set secrets directly:
  ```bash
  npx convex env set BETTER_AUTH_SECRET "$(openssl rand -base64 32)"
  npx convex env set RESEND_API_KEY re_...   # ask the user for this one value
  npx convex env set SITE_URL http://localhost:3000
  ```
  Copy the `.convex.cloud` / `.convex.site` URLs into the app env files yourself.
- **Verify:** `check-setup --accounts` → `convex|ready`.
</account>

<account name="Apple Developer" cost="$99/yr, 24–48h" gates="iOS">
- **API access:** an **App Store Connect API key** = key ID + issuer ID + `.p8` file, driving the `asc` CLI.
- **Acquire (manual bits only):** the user enrolls at [developer.apple.com](https://developer.apple.com/programs/enroll/) and creates the key (Users and Access → Integrations → App Store Connect API), downloading the `.p8` **once**. Then **invoke the `ns-find-asc-credentials` skill** — it locates the key/issuer (reading the issuer ID from the signed-in browser session) and runs `asc auth login`. Read the Team ID (Membership) and write it to `site-config.ts > appleTeamId`.
- **Then automated:** with `asc` authenticated, app creation, metadata, IAP, screenshots, and review submission run through the CLI (`/ns ios distribute`).
- **Verify:** `check-setup --accounts` → `apple|ready`.
</account>

<account name="Google Play" cost="$25 one-time, days to verify" gates="Android">
- **API access:** a **service-account JSON key** with Play Developer API access — the single credential every Android publish tool consumes. This repo's Android tool is **`gpc` (Google Play Console CLI)**, with **Fastlane `supply`** as fallback (NOT EAS Submit — see `.agents/skills/ns-deploy-android-app/SKILL.md`). EAS only builds the `.aab`.
- **Acquire:** account may be **pending identity verification** (the console locks app creation + API access until Google approves, usually a few days — set the credential up now anyway so publishing is one command once unlocked). Steps:
  1. **Create the service account + JSON key:**
     - If `gcloud` is installed and authed, the skill creates it non-interactively:
       ```bash
       gcloud iam service-accounts create play-publisher --display-name "Play Publisher"
       gcloud iam service-accounts keys create mobile-app/google-play-service-account.json \
         --iam-account play-publisher@<PROJECT_ID>.iam.gserviceaccount.com
       ```
     - Otherwise (gcloud absent, as on this machine) create it in **Google Cloud Console → IAM & Admin → Service Accounts**, then download a JSON key.
  2. **Manual grant (web-only, unavoidable):** in Play Console → *Setup → API access* (https://play.google.com/console/api-access), link the Cloud project and **invite the service-account email**, granting release/admin permissions. Only the user can do this, and only after the account is verified.
- **Store:** keep the JSON at `mobile-app/google-play-service-account.json` (confirm it's git-ignored); `gpc` reads it via `gpc auth login --service-account <path>` or `GPC_SERVICE_ACCOUNT`.
- **Then automated:** `gpc config init` once, then `gpc preflight` / `gpc publish` / `gpc releases ...` drive the whole release through the API (`/ns android distribute`). Fastlane `supply` is the fallback if `gpc` is blocked.
- **Verify:** `check-setup --accounts` → `googleplay|ready`.
</account>

<account name="Expo / EAS" cost="free" gates="mobile builds">
- **API access:** the EAS CLI session (`eas login`), and optionally an **`EXPO_TOKEN`** access token (expo.dev → Account → Access tokens) for non-interactive builds.
- **Acquire:** the user signs up at [expo.dev](https://expo.dev); run `eas login` (or `npx eas-cli login`). Then create the project: `cd mobile-app && npx eas-cli init` and write the printed project id to `site-config.ts > easProjectId` (public id).
- **Then automated:** `eas build` / `eas submit` run under your control. Store secrets as EAS secrets, not in `eas.json`.
- **Verify:** `check-setup --accounts` → `eas|ready`.
</account>

<account name="Vercel" cost="free" gates="web app + admin">
- **API access:** the Vercel CLI session (`vercel login`) or a **Vercel token** (vercel.com/account/tokens) — both let the skill manage the project and env vars from the CLI.
- **Acquire:** `npm i -g vercel && vercel login`. Link the project from the **repo root**: `vercel link` (so a CLI deploy uploads the whole monorepo). `npm run setup:vercel` then sets the project Root Directory = `web-app`.
- **Then automated:** set production env yourself via CLI instead of the dashboard:
  ```bash
  vercel env add CONVEX_DEPLOY_KEY production      # the prod deploy key from the Convex step
  vercel env add VITE_CONVEX_SITE_URL production   # prod .convex.site
  ```
  Deploy from the repo root with `vercel --prod --archive=tgz`, or push to main (`/ns web deploy`).
- **Verify:** `check-setup --accounts` → `vercel|ready`.
</account>

<account name="Stripe" cost="free, % per charge" gates="web/Android payments">
- **API access:** the Stripe **secret key** (and the Stripe CLI session via `stripe login`) — full API control of products, prices, and webhooks.
- **Acquire:** skip if iOS-only. Otherwise the user signs up at [stripe.com](https://stripe.com); run `stripe login`. Hand the key/price/product wiring to the **`ns-setup-stripe` skill**, which sets `STRIPE_SECRET_KEY`/`STRIPE_PRICE_ID` in Convex env and creates products via the API.
- **Verify:** `check-setup --accounts` → `stripe|ready`.
</account>

<account name="Social sign-in (Google / Apple OAuth)" cost="free" gates="Google/Apple login on web + mobile">
- **What this is:** the OAuth credentials behind the "Continue with Google/Apple" buttons. This is SEPARATE from the Apple Developer (App Store) and Google Play (publishing) accounts above — those don't enable login. The buttons stay HIDDEN on web and mobile until these creds exist: the `api.auth.getEnabledAuthProviders` query only reports a provider as available when its flag is on AND its credentials are set. Until then the gate is email-OTP only.
- **Skip rule:** only set up the providers whose `SiteConfig.features.enable<Provider>SignIn` flag is `true`. Email-OTP always works with no extra credential (only `RESEND_API_KEY`).
- **Google:** in **Google Cloud Console → APIs & Services → Credentials**, create an **OAuth 2.0 Client ID** (type: Web application). Authorized redirect URI = `https://<your-convex-site-url>/api/auth/callback/google`. Then store the pair in Convex env:
  ```bash
  npx convex env set GOOGLE_CLIENT_ID <id>.apps.googleusercontent.com
  npx convex env set GOOGLE_CLIENT_SECRET <secret>
  ```
- **Apple:** needs a **Services ID** (not the app bundle ID) + a key-signed client secret from the Apple Developer account. Redirect URI = `https://<your-convex-site-url>/api/auth/callback/apple`. Store as `APPLE_CLIENT_ID` (the Services ID) and `APPLE_CLIENT_SECRET` in Convex env. The native iOS button uses the on-device Apple credential and needs no web redirect, but `convex/auth.ts` still reads these env vars.
- **Also set** `npx convex env set SITE_URL <your-web-origin>` so the cross-domain redirect returns to the right place.
- **Parity:** the provider must be wired on BOTH surfaces — see `.agents/rules/auth-payments-storage.md` (Social sign-in parity): `convex/auth.ts` `socialProviders`, `mobile-app/app/onboarding/sign-in-form.tsx`, and `web-app/app/components/otp-login-gate.tsx`, all gated on the same `SiteConfig.features` flag.
- **Verify:** load `/admin` (or `/app`) signed out — once the creds are set the provider button now appears (it's hidden without them). Click it and confirm it redirects to the provider.
</account>

<finish>
When every targeted account is `ready` (skipped ones noted), run the full validator once:

```bash
npm run check-setup
```

Summarize per service: API access obtained / skipped (and what skipping blocks), where each credential lives, and the recommended next command — usually `/ns setup` to turn the boilerplate into the real product.
</finish>
