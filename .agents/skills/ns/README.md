# /ns — Product CLI Skill (index)

Human documentation for the `ns` skill family: architecture, design decisions, and how to maintain or extend it. Agents read the `SKILL.md` files; this README is for you.

## Architecture

`ns` is a thin **index**. Each lifecycle workflow is its own standalone, auto-invocable skill in the `ns-*` family. This matters: a buried `references/` file only loads when `/ns` is explicitly called, so "deploy my app" would never trigger it. As top-level skills with their own descriptions, the workflows auto-invoke directly.

```
.agents/skills/
├── ns/SKILL.md        # index: subcommand tables, NL mode, lifecycle status
├── ns/README.md       # this file (humans only)
├── ns-web-deploy/           # Vercel + Convex deploy (production deploy key)
├── ns-ios-testflight/       # iOS beta: local app → TestFlight build
├── ns-ios-distribute/       # iOS release: TestFlight → App Store review
├── ns-notification/         # Expo push + Convex notifications + iOS/APNs checks
├── ns-android-beta/         # Android beta: build AAB → Play internal track
├── ns-android-distribute/   # Android release: promote internal → production
├── ns-release/              # version bump + changelog + promote latest beta builds
└── ns-images/               # AI app icon / onboarding / splash
```

Each `ns-*` skill has a description tuned for **self-invocation** — overlapping trigger phrases (e.g. "deploy my app") so the model surfaces the relevant surface(s). The `ns` index is for explicit, ordered, multi-step runs ("deploy web + iOS").

## Subcommand map

| Command | Skill |
| --- | --- |
| `/ns onboard` | `../ns-onboard` (first-run wizard: tools → accounts → Convex → new repo → brief → rebrand) |
| `/ns doctor` | `../ns-doctor` (install the machine's CLIs) |
| `/ns setup` | `../ns-init-project` |
| `/ns check` | inline → `npm run check-setup` |
| `/ns dev` | inline |
| `/ns stripe` | `../ns-setup-stripe` |
| `/ns notification` | `../ns-notification` |
| `/ns screenshots` | `../ns-generate-store-screenshots` |
| `/ns images` | `../ns-images` |
| `/ns docs` | `../ns-add-documentation` |
| `/ns optimize` | `../ns-optimizer` |
| `/ns ios setup` | `../ns-ios-testflight` (phases A-D) |
| `/ns ios testflight` | `../ns-ios-testflight` (all phases) |
| `/ns ios distribute` | `../ns-ios-distribute` |
| `/ns android beta` | `../ns-android-beta` |
| `/ns android distribute` | `../ns-android-distribute` |
| `/ns web deploy` | `../ns-web-deploy` |
| `/ns release` | `../ns-release` (bump + changelog + promote latest beta builds) |
| `/ns status` / `<goal>` | inline (index): diagnose → plan → confirm once → chain |

## Design decisions

1. **Standalone skills over umbrella+references.** Auto-discovery keys off each skill's `description`. Top-level `ns-*` skills auto-invoke; references buried in one skill do not. The index still exists for explicit multi-step orchestration.
2. **Self-invocation descriptions.** Every `ns-*` description front-loads natural-language triggers ("deploy my app", "submit for review", "publish to TestFlight") so a student's request reaches the right skill without naming it.
3. **Deep tool skills stay separate.** `ns-deploy-ios-app` (asc) and `ns-deploy-android-app` (gpc) are detailed CLI references; `ns-ios-distribute` / `ns-android-distribute` point to them for tool minutiae instead of duplicating.
4. **Symmetric beta/release per platform.** iOS: `ns-ios-testflight` (beta) → `ns-ios-distribute` (release). Android: `ns-android-beta` (internal track) → `ns-android-distribute` (production promote). `ns-release` sits above both — it bumps the version, generates the changelog, and promotes the already-validated beta builds to production (never rebuilds).
5. **Repo-only tooling.** `eas-cli`, `asc`, `gpc`, `openssl`, `node`, Maestro, and the repo scripts below. Secrets come from env vars, never hardcoded.
6. **Confirmation policy.** Store mutations need explicit confirmation; the index's NL mode confirms a whole plan once but always re-confirms the final App Store review submission.

## Supporting repo pieces

| Piece | Role |
| --- | --- |
| `scripts/setup-vercel-convex.mjs` (`npm run setup:vercel`) | mints the Convex production deploy key + sets Vercel env (used by `ns-web-deploy`). |
| `mobile-app/scripts/asc-api.mjs` | zero-dep App Store Connect API client (certs, profiles, beta groups, metadata, review). |
| `mobile-app/scripts/store-screenshots.mjs` | dry-run-first screenshot wrapper. |
| `scripts/check-setup.mjs` (`npm run check-setup`) | config validator (placeholders, env, Convex secrets, `web-app/vercel.json` build command). |
| `docs/production-checklist.md` / `docs/troubleshooting.md` | human runbooks the skills follow. |

## Hard-won facts (encoded in the skills)

- Web: the `nitro` Vite plugin is mandatory — without it Vercel ships a SPA and every route 404s. The Vercel build must run `convex deploy` (via `web-app/vercel.json` → `build:vercel`), needs `CONVEX_DEPLOY_KEY` (prod) + Root Directory = `web-app`. `VITE_CONVEX_URL` is injected at build time — never hardcoded. Deploy from the repo root with `--archive=tgz` (or push to main), never `cd web-app && vercel --prod`.
- iOS credentials automate only via the ASC API key path; Apple-ID login needs 2FA — never script it. `.p12` must use OpenSSL's `-legacy` flag. `asc publish testflight` requires `--group`.
- App records and the App Privacy questionnaire are web-only (manual gates).
- Screenshots: 1284×2778, display type `IPHONE_65`, demo account `appstoretest@email.com` / OTP `123456`.
- `ns-images` requires an image-generation tool (Codex/gpt-image); other agents hand the prompts to the user.

## Extending

- New workflow → new `ns-<name>/SKILL.md` with a self-invocation description (50–300 chars, front-loaded triggers), add a row to the index table.
- Keep each skill self-contained; reference deep tool skills rather than duplicating.
- Validate: `bun ~/.claude/skills/skill-manager/scripts/inspect-description.ts .agents/skills`.
