---
name: ns
description: "NowStack Mobile product CLI. Use for `/ns` goals: onboard, setup, ios local-setup/setup/testflight/audit/distribute/verification/deeplink/notification, android setup/beta/distribute, setup-expo, dev, check, release, web deploy/landing-page, status."
argument-hint: "[onboard|create-app|prd|architecture|tasks|doctor|accounts|setup|setup-ios|setup-android|setup-expo|check|set-admin|dev|stripe|r2|notification|screenshots|icon|images|docs|optimize|release|ios local-setup|ios setup|ios testflight|ios audit|ios distribute|ios verification|ios deeplink|ios notification|android setup|android beta|android distribute|web deploy|web landing-page|status] or a goal in natural language"
---

# NowStack - Product CLI

One command for the whole app lifecycle. This skill is the INDEX that ROUTES and SEQUENCES — each workflow is its own standalone `ns-*` skill (auto-invocable on its own, e.g. "deploy my app" can trigger `ns-web-deploy` / `ns-ios-distribute` directly). Never duplicate their content here; invoke or read the target skill.

## Platform Build Routing

For every mobile build, beta, TestFlight, Play, release, or store-submission workflow, detect the user's OS before choosing a build path:

```bash
uname -s   # Darwin = macOS; Linux = Linux; Windows = use PowerShell/Node platform checks
```

- **macOS / Darwin**: local build paths are allowed for both iOS and Android (`eas build --local`, Xcode, Gradle/Android Studio). Prefer local builds by default when signing/tooling is available.
- **Windows or Linux**: do not attempt local iOS or Android production builds. Load/follow `.agents/skills/ns-setup-expo/SKILL.md` first, verify `eas-cli`, `eas whoami`, linked `easProjectId`, and `expo-doctor`, then use EAS cloud builds for the build artifact.
- If `uname` is unavailable, detect with `node -p "process.platform"` or PowerShell. Treat `darwin` as macOS; treat `win32` and `linux` as EAS-cloud-only for production mobile builds.

Parse `$ARGUMENTS`:
1. Starts with a known subcommand → route per the tables below; the rest of the line is context for the target workflow.
2. `help`, or a question about the CLI itself ("what can you do?") → explain yourself: one line on what /ns is, the subcommand tables below with their one-line purposes, then a one-line lifecycle status with the recommended next command.
3. Empty or `status` → Lifecycle Status below.
4. Anything else (e.g. "deploy l'application web et l'application ios") → Natural-Language Mode below.

## Subcommands

| Subcommand | What it does | Follow this file |
| --- | --- | --- |
| `onboard` | **First-run wizard.** Chains the whole initial setup: tools → accounts → Convex → your own clean Git repo → product brief → rebrand → finish | `.agents/skills/ns-onboard/SKILL.md` |
| `doctor` | Install the developer CLIs this machine needs (eas, vercel, gpc, asc, fastlane, bun, gcloud) via brew/npm; offer Xcode/Android Studio. Run before `accounts` | `.agents/skills/ns-doctor/SKILL.md` |
| `accounts` | Create + connect external accounts (Convex, Expo/EAS, Apple, Vercel, Stripe, Play). Verifies, logs in, writes credentials. Skippable per account | `.agents/skills/ns-setup-accounts/SKILL.md` |
| `setup` | Initialize/rebrand the boilerplate as a real product (site-config, copy, Convex env) | `.agents/skills/ns-init-project/SKILL.md` |
| `check` | Validate configuration | inline: run `npm run check-setup`, explain and fix failures (see SETUP.md) |
| `set-admin` | Grant admin access to a user by email (Convex `isAdmin`). Fixes `/admin` denial / infinite loader | `.agents/skills/ns-set-admin/SKILL.md` |
| `dev` | Run the app locally | inline, see Dev below |
| `stripe` | Configure Stripe payments (web/Android) | `.agents/skills/ns-setup-stripe/SKILL.md` |
| `r2` | Set up Cloudflare R2 image/file uploads (bucket, S3 creds, Convex env) | `.agents/skills/ns-setup-r2/SKILL.md` |
| `notification` (alias `notifications`, `push`) | Set up iOS/APNs-oriented Expo push notifications with Convex tokens/preferences/logs and admin tests | `.agents/skills/ns-ios-notification/SKILL.md` |
| `setup-ios` | Legacy alias for `ios local-setup` | `.agents/skills/ns-ios-setup/SKILL.md` |
| `setup-android` | Set up the **local** Android dev env (Android Studio, SDK tools, JDK 17, Pixel AVD) and run the first `npm run android` in the emulator. macOS local path; Windows/Linux release builds route through EAS. NOT the Play internal/production release setup — that's `android beta` / `android distribute` | `.agents/skills/ns-setup-android/SKILL.md` |
| `setup-expo` | Set up the **Expo/EAS platform** layer: eas-cli, log into the Expo account, link the EAS project (writes `easProjectId` into `site-config.ts`), validate with `expo-doctor`. Required before Windows/Linux cloud builds. NOT the local Mac toolchain (`ios local-setup`) nor the build itself (`ios testflight`) | `.agents/skills/ns-setup-expo/SKILL.md` |
| `screenshots` | Generate store screenshots | `.agents/skills/ns-generate-store-screenshots/SKILL.md` |
| `icon` (alias `app-icon`, `logo`) | Generate the **app icon/logo system**: exactly 8 different iOS-quality icon candidates first, one polished final iOS icon next, then Android adaptive + favicon/web logo assets. REQUIRES an image-generation tool (Codex/gpt-image); other agents follow its fallback | `.agents/skills/ns-icon/SKILL.md` |
| `images` | Generate onboarding backgrounds, splash, brand art (NOT the icon — that's `icon`). REQUIRES an image-generation tool (Codex/gpt-image); other agents follow its fallback | `.agents/skills/ns-images/SKILL.md` |
| `docs` | Write/update repo docs in `docs/` (house style, real paths, verified commands) | `.agents/skills/ns-add-documentation/SKILL.md` |
| `optimize` | Performance/quality pass across Convex, Expo, and TanStack Start | `.agents/skills/ns-optimizer/SKILL.md` |
| `release` | Cut a release: bump version, generate changelog, promote the latest TestFlight + Play-internal build to production (no rebuild) | `.agents/skills/ns-release/SKILL.md` |
| `status` | Where is this app in the lifecycle? What's next? | inline, below |

### `planning` pipeline (mobile-aware PRD → architecture → tasks)

`create-app` runs the whole pipeline in one flow; or call a single step. Each step reads the previous doc. Feeds `/ns setup` (config values) and implementation (`apex`/`oneshot`).

| Subcommand | What it does | Follow this file |
| --- | --- | --- |
| `create-app` | **One command: idea → build-ready plan.** Orchestrates PRD → architecture → tasks, then offers `/ns setup` + hands off to `apex`/`oneshot`. Use to start a new product | `.agents/skills/ns-create-app/SKILL.md` |
| `prd` | Interactive discovery → `.agents/plan/PRD.md` (vision, personas, onboarding/paywall flow, platforms, IAP/subscription monetization, metrics, MVP scope) | `.agents/skills/ns-prd/SKILL.md` |
| `architecture` | `.agents/plan/PRD.md` → `.agents/plan/ARCHITECTURE.md` mapped onto the fixed stack (Convex schema/indexes/functions, Expo screens, Better Auth, IAP/Stripe, R2, ADRs, build order) | `.agents/skills/ns-architecture/SKILL.md` |
| `tasks` | PRD + ARCHITECTURE → `.agents/plan/tasks/*.md` + README — autonomous 1–3h vertical slices with verification commands | `.agents/skills/ns-tasks/SKILL.md` |

### `ios` namespace

| Subcommand | What it does | Follow this file |
| --- | --- | --- |
| `ios local-setup` (alias `setup-ios`) | Set up the **local** iOS dev env (Xcode license/CLT/first-launch, Simulator runtime, CocoaPods, Watchman, deps) and run the first `npm run ios` in the Simulator. macOS only. NOT the TestFlight signing setup — that's `ios setup` | `.agents/skills/ns-ios-setup/SKILL.md` |
| `ios setup` | EAS project init + Convex prod wiring + Apple signing credentials (everything BEFORE the first build) | `.agents/skills/ns-ios-testflight/SKILL.md` phases A-D only — stop before the build and report readiness |
| `ios audit` | Read-only App Store Review Guideline audit before submission (IAP/Restore, in-app account deletion, Sign in with Apple parity, permission strings, privacy/AI disclosure, export compliance) → triaged blockers/warnings/manual-gates report | `.agents/skills/ns-ios-audit/SKILL.md` |
| `ios testflight` | OS-aware production build + TestFlight upload: macOS defaults to local `eas build --local`; Windows/Linux must run `ns-setup-expo` then use EAS cloud | `.agents/skills/ns-ios-testflight/SKILL.md` end to end |
| `ios distribute` | TestFlight build → screenshots, metadata, IAP, compliance, review submission | `.agents/skills/ns-ios-distribute/SKILL.md` |
| `ios verification` (alias `verify`) | Verify a `mobile-app/**` change in the Simulator via `xcrun simctl` — single-agent (one Metro on 8081) or parallel multi-agent (dedicated Simulator + Metro port per agent), deep-link nav, temp preview route, programmatic OTP test login (`appstoretest@email.com` / `123456`) | `.agents/skills/ns-ios-verification/SKILL.md` |
| `ios deeplink` (alias `deeplink`, `universal-links`) | Fix and verify iOS Universal Links, TestFlight deeplinks, AASA, associated domains, and auth return flows | `.agents/skills/ns-ios-deeplink/SKILL.md` |
| `ios notification` (alias `notifications`, `push`) | Set up iOS/APNs-oriented Expo push notifications and verify delivery with EAS/TestFlight constraints | `.agents/skills/ns-ios-notification/SKILL.md` |

`testflight` alone = `ios testflight` (`ns-ios-testflight`). `distribute` alone = `ios distribute` (`ns-ios-distribute`). `audit` alone = `ios audit` (`ns-ios-audit`) — run it before `distribute` to clear predictable App Store rejections. For asc-level store details: `.agents/skills/ns-ios-deploy-app/SKILL.md`.

> **`ios setup` (signing) vs `ios local-setup` (local dev) — don't confuse them.** `ios setup` wires EAS project metadata, production Convex URLs, and Apple **signing** credentials for TestFlight. `ios testflight` chooses the build path from the OS: local on macOS, EAS cloud on Windows/Linux after `ns-setup-expo`. `ios local-setup` sets up Xcode, Simulator, and CocoaPods so `npm run ios` previews the dev build on this Mac. `setup-ios` remains a legacy alias.

### `android` namespace

Mirrors iOS: `setup` is local development, `beta` is the testing-track (TestFlight-equivalent) surface, `distribute` is the production release.

| Subcommand | What it does | Follow this file |
| --- | --- | --- |
| `android setup` | Android Studio + SDK + latest practical Pixel emulator + local Expo Android development build | `.agents/skills/ns-setup-android/SKILL.md` |
| `android beta` | OS-aware signed AAB + Play **internal** track upload: macOS can build locally; Windows/Linux must run `ns-setup-expo` then use EAS cloud | `.agents/skills/ns-android-beta/SKILL.md` |
| `android play-console-release` | Finish Play Console setup and internal-track upload when `gpc` hits rejected-update or commit timing bugs | `.agents/skills/ns-android-play-console-release/SKILL.md` |
| `android distribute` | Promote the tested internal build to **production** → listing, Data safety, content rating, staged rollout | `.agents/skills/ns-android-distribute/SKILL.md` (deep gpc details: `.agents/skills/ns-deploy-android-app/SKILL.md`) |

### `web` namespace

| Subcommand | What it does | Follow this file |
| --- | --- | --- |
| `web landing-page` (aliases `web landing`, `landing-page`) | Refresh the public landing page style using live reference screenshots, user keep/change direction, and web screenshot verification | `.agents/skills/ns-web-landing-page/SKILL.md` |
| `web deploy` | Deploy the web app to Vercel with Convex shipped alongside (deploy key + env wiring) | `.agents/skills/ns-web-deploy/SKILL.md` |

Unknown subcommand → show these tables, then run Lifecycle Status.

## Natural-Language Mode

When the user states a goal ("/ns deploy the web app and the iOS app", "get my app reviewed"), do this — properly, end to end:

1. **Diagnose**: run the Lifecycle Status checks to learn what is already done (config? Convex prod? EAS project? credentials? build on TestFlight? listing state?).
2. **Plan**: map the goal to an ordered chain of subcommands, skipping what's done. Dependencies are strict:
   - `check` clean → before anything that ships.
   - `web deploy` → before `ios distribute` / `android distribute` (privacy/terms URLs must be live for review).
   - `ios setup` → `ios testflight` → `ios audit` (clear blockers) → `ios distribute`, in that order.
   - `android beta` → `android distribute`, in that order (beta build verified before promoting to production).
   - `release` is the version-cut layer: it runs AFTER a build is on TestFlight + Play internal, and chains into `ios distribute` / `android distribute` with a version bump + changelog. Use it for "ship the latest TestFlight version".
   - Example for "deploy web + iOS": `check` → `web deploy` → `ios setup` → `ios testflight` → `ios distribute` (screenshots + metadata + review included).
   - Example for "release the update everywhere": `release` (bump + changelog) → `ios distribute` + `android distribute`.
3. **Confirm once**: show the plan with what each step will mutate (Vercel deploy, local signed iOS build, EAS build credits only when `--expo` is used, App Store uploads, review submission). Get ONE explicit user confirmation for the externally-visible steps, then execute the chain without re-asking between steps — but ALWAYS stop and ask before the final review submission.
4. **Execute**: follow each target file in order. If a step fails, stop, report precisely where the chain stands and what remains, fix or ask.
5. **Report**: per step — done/skipped(already)/failed, plus the final state (URLs, build number, TestFlight group, listing status) and any remaining manual gates (e.g. App Privacy questionnaire is web-only).

## Dev (`/ns dev`)

```bash
npm run start-all          # Convex + web + mobile, one terminal
# or separately: npx convex dev (root) + cd mobile-app && npm run ios
```

- Payments/Apple Sign In need a development build (`npm run ios`), not Expo Go.
- Second Expo app running? Use `npx expo start --port 8082`.
- Anything broken → `docs/troubleshooting.md`.

## Lifecycle Status (`/ns status`)

Run these checks IN ORDER; the first one that fails is where the user is. Report the stage, what's done, and the exact next command.

```bash
node scripts/check-setup.mjs --accounts      # parse service|status lines: any todo?
node scripts/check-setup.mjs --skip-convex   # parse: errors vs warnings
grep -m1 'title:' site-config.ts             # still "NowStack" -> setup not done
grep -m1 'easProjectId:' site-config.ts      # placeholder -> pre-TestFlight
```

| Stage | Signal | Next step |
| --- | --- | --- |
| 0. Fresh clone | repo still points at `Melvynx/nowstack-mobile`, nothing set up | `/ns onboard` (runs the whole first-run wizard) |
| 0a. No CLIs | required CLIs missing (`command -v eas/vercel/asc` fail) | `/ns doctor` |
| 0b. No accounts | `check-setup --accounts` reports required `todo` (Convex not logged in) | `/ns accounts` |
| 1. Not initialized | `site-config.ts` title is still "NowStack" / placeholder URLs | `/ns setup` |
| 2. Config incomplete | `check-setup` reports errors (.env, Convex env vars) | `/ns check` |
| 3. Local dev | config clean, no EAS project (`easProjectId` placeholder) | build the product, then `/ns ios setup` |
| 4. Beta-ready | EAS project/signing exists; check TestFlight with `asc status --app <id> --output table` or local/cloud build history with `cd mobile-app && npx eas-cli@latest build:list --limit 1 --json --non-interactive` | `/ns ios testflight` (iOS) / `/ns android beta` (Android) |
| 5. Store submission | build on TestFlight / Play internal; check listing: `asc status --app <id> --output table` (needs `ASC_*`; skip if unavailable) | `/ns ios distribute` + `/ns android distribute` |
| 6. Live | version released | `/ns release` to cut the next version (bump + changelog + promote), `/ns web deploy` for web, `/ns screenshots` to refresh listings |

Keep the status report short: current stage, 2-3 bullet facts, one recommended next command.

## Rules

- Read the matching `.agents/rules/*.md` before acting (the target workflows list them).
- Store mutations (builds, uploads, submissions) always require explicit user confirmation — in Natural-Language Mode, the single upfront plan confirmation covers the chain EXCEPT the final review submission, which always gets its own confirmation.
- Convex backend work is NOT part of this CLI — route backend tasks to `.agents/skills/ns-convex/SKILL.md` as usual.
