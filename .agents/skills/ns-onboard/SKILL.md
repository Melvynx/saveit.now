---
name: ns-onboard
description: First-run setup wizard for a freshly cloned NowStack Mobile. Installs the machine's CLIs, connects every account, wires Convex, creates YOUR own clean Git repo, gathers the product brief, then rebrands the boilerplate into your app. Use for "set up my project", "initial setup", "onboard me", "ns onboard", "I just cloned this", or the very first run.
---

# ns-onboard — First-run wizard

<objective>
Take someone from "I just cloned NowStack Mobile" to "my own app, my own repo, running locally" in one guided flow. This skill **orchestrates** — it diagnoses, plans, confirms once, then invokes the existing `ns-*` skills in order. Never duplicate their content; invoke or read the target skill.
</objective>

<orchestration>
1. **Diagnose** what's already done (CLIs present? accounts connected? Convex deployment? still the boilerplate repo? title still "NowStack"?), so finished steps are skipped.
2. **Show the plan** — the steps below, what each mutates (installs, signups, a new GitHub repo, Convex env). Get **one** confirmation for the whole wizard.
3. **Execute in order**, skipping done steps. Two steps ALWAYS get their own extra confirmation regardless of the upfront one: **creating the new Git repo** (step 5, it rewrites git) and any **paid signup** inside accounts.
4. **Report** after each step: done / skipped(already) / failed, and where the user stands.
</orchestration>

## Steps

Run in this order. (Tools come before account *logins* because connecting an account needs its CLI — this is the user's "accounts + CLIs", sequenced so the logins actually work.)

<step n="1" title="Install the machine's tools" maps="user step 2">
Invoke **`ns-doctor`** — detect + install everything missing (eas, vercel, convex, asc, gpc, fastlane, bun, gcloud; offer Xcode/Android Studio), OS-aware. One confirmation, then install.
</step>

<step n="2" title="Install project dependencies">
Install node modules in **all three** workspaces so every binary (`expo`, `convex`, `tsc`, `vinxi`) actually resolves — a missing/empty `node_modules` is why `npm run ios` later fails with `expo: command not found`. Run in **root**, **`web-app/`**, and **`mobile-app/`**:
```bash
npm install            # repo root (Convex backend deps)
cd web-app && npm install && cd ..
cd mobile-app && npm install && cd ..
```
- **Verify each install for real** — check the exit code AND that the tree landed (`ls mobile-app/node_modules/.bin/expo`). A trailing `echo`/`&&` can mask a failed npm; do not trust a bare "exit 0".
- **Mobile peer-deps:** `mobile-app/.npmrc` pins `legacy-peer-deps=true` (Expo + React 19 pull `react-dom` at a newer patch than the pinned `react`, which trips npm's strict peer resolver). Keep that file; do not pass conflicting `--no-legacy-peer-deps`. If `node_modules` is stale, prefer `npm ci`.
- Skip a workspace only if its `node_modules/.bin` is already populated.
</step>

<step n="3" title="Create + connect all accounts" maps="user step 1">
Invoke **`ns-setup-accounts`** — per service: signup (manual), log in via CLI, write the credential to its home, verify. Every account is skippable. Covers Convex, Expo/EAS, Apple, Vercel, Stripe, Google Play, and the **Cloudflare R2** token (auto-provisioned by `ns-setup-r2`'s script + pre-filled token link). Ask up front which surfaces they ship (iOS? Android? web? payments?) to skip whole branches.
</step>

<step n="4" title="Wire Convex" maps="user step 3">
Ensure a dev deployment exists (`npx convex dev` once → writes `CONVEX_DEPLOYMENT`), the client URLs are in the env files, and the minimum backend secrets are set so sign-in works:
`BETTER_AUTH_SECRET` (`openssl rand -base64 32`), `RESEND_API_KEY`, `EMAIL_FROM`, `SITE_URL`. (Mostly handled inside step 3; verify here.)
</step>

<step n="5" title="Create YOUR own clean Git repo" maps="user step 4">
The clone still points at the boilerplate — give the user their own repo. **`gh` is required** (`gh auth status`).

⚠️ **Guard:** never run this on the canonical boilerplate itself. Refuse if `git remote get-url origin` is `…/Melvynx/nowstack-mobile` AND the user is the maintainer / hasn't confirmed this is their fork-to-be. Always show `git remote -v` and get explicit confirmation first.

Offer two modes:
- **Fresh history (recommended for students):** `trash .git` (NEVER `rm -rf`), then `git init && git add -A && git commit -m "chore: init from NowStack Mobile"`.
- **Keep history:** `git remote remove origin`.

Then create + push the new repo (private by default):
```bash
gh repo create <project-name> --private --source=. --remote=origin --push
```
Confirm the name with the user (default: the app slug from step 6/7).
</step>

<step n="6" title="Gather the product brief (PRD)" maps="user step 5">
Collect ONE product brief — don't run a long questionnaire if the user already gave the idea. Capture: app idea/positioning, **title**, **slug**, **bundleId** (reverse-domain), company/legal, brand colors, pricing + IAP product ids, domain, admin emails. This feeds step 7. (This is the intake phase of `ns-init-project`.)
</step>

<step n="7" title="Rebrand the boilerplate into the app" maps="user step 6">
Invoke **`ns-init-project`** — apply the brief: `site-config.ts` + mirror to `convex/siteConfig.ts`, product copy across `web-app/` and `mobile-app/`, onboarding images (`ns-images`), `App.storekit` product id, and backend env. Then optionally `eas init` → `easProjectId` if they'll do store builds.
</step>

<step n="8" title="Finish" maps="user step 7">
- `npm run check-setup` — must be clean (or only expected warnings).
- Summarize: accounts connected / skipped (and what skipping blocks), repo URL, Convex deployment, what's branded.
- Hand off the run command: `npm run start-all` (Convex + web + mobile), with `npm run ios` for a dev build (payments/Apple Sign In need it, not Expo Go).
- Point at the next milestones: `/ns web deploy`, `/ns ios testflight`, `/ns android beta`.
</step>

<rules>
- Orchestrate, don't duplicate: invoke `ns-doctor`, `ns-setup-accounts`, `ns-setup-r2`, `ns-init-project`, `ns-images` and follow their rules.
- **NEVER `rm -rf`** — use `trash` (the git-detach step removes `.git`).
- The new-repo step is destructive and outward-facing — its own explicit confirmation, and the boilerplate guard above.
- Accounts are skippable; only Convex is required to run the app.
- Keep secrets in Convex env / their proper home; never commit credentials.
- Skip any step already done (idempotent); re-running the wizard must be safe.
</rules>
