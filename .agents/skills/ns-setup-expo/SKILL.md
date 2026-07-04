---
name: ns-setup-expo
description: Set up the Expo/EAS account layer for NowStack Mobile: eas-cli, Expo login, EAS project link, easProjectId, and expo-doctor. Required before Windows/Linux cloud builds.
---

# ns-setup-expo — Expo / EAS platform setup

<objective>
Get the **Expo side** ready: `eas-cli` installed, signed into the Expo account, the app **linked to an EAS project** (`easProjectId`), and `expo-doctor` green. This is the platform/account layer that EAS versioning, macOS local EAS builds, and required Windows/Linux cloud builds depend on.

It is NOT the local Mac toolchain (Xcode, Simulator, CocoaPods → `/ns ios local-setup`), NOT the everyday run loop (`/ns dev` → `npm run ios`/`start`), and NOT the signing + build itself (`/ns ios setup` → `/ns ios testflight`). Those can come before or after; this skill owns *Expo account + project wiring + project health*.

Detect what's already done, do only the gaps, confirm once before creating the Expo project (it's an outward-facing resource on the user's account).
</objective>

<platform_context>
Every mobile build/release skill must check the OS first. When the OS is Windows or Linux, those skills must load/follow this skill before any iOS TestFlight or Android Play build, because the production build artifact must come from EAS cloud. On macOS, this skill is still needed for EAS project/versioning and can support local EAS builds, but it is not a replacement for Xcode or Android Studio local tooling.
</platform_context>

<components>
| Step | Check | Fix |
| --- | --- | --- |
| **eas-cli** | `eas --version` | `npm i -g eas-cli` — or run **`/ns doctor`** (owns CLI installs) |
| **Mobile deps** (the local `expo` binary) | `ls mobile-app/node_modules/.bin/expo` | `cd mobile-app && npm install` (`mobile-app/.npmrc` pins `legacy-peer-deps=true` for the Expo + React 19 peer mismatch — verify the tree actually landed). Overlaps `/ns onboard` step 2 — skip if populated. |
| **Expo account login** | `eas whoami` prints a username | `eas login` (account *creation* is `/ns accounts`; this skill verifies + can log in an existing account) |
| **EAS project linked** | `grep easProjectId site-config.ts` is a real UUID, not `xxxxxxxx-…` | `eas init` — see wiring below. **Confirm first** (creates a project on the user's Expo account). |
| **Project health** | n/a | `cd mobile-app && npx expo-doctor` (SDK / native-module / config-plugin compatibility) |
</components>

<easprojectid_wiring>
**The source of truth for the EAS project id is `site-config.ts`, not `app.json`.** `mobile-app/app.config.ts` reads `extra.eas.projectId = SiteConfig.easProjectId` (≈ line 90), and the config is dynamic — so `eas init` cannot auto-write it.

Flow when `easProjectId` is still the `xxxxxxxx-…` placeholder:
1. `cd mobile-app && eas init` — creates (or links) the EAS project under the logged-in account and prints the **project id** (a UUID). If it offers to create vs. link an existing one, ask the user which.
2. Write that UUID into **`site-config.ts`** → `easProjectId: "<uuid>"` (replace the placeholder). Do **not** edit `app.config.ts` or add it to `app.json` — `app.config.ts` already derives it from `SiteConfig`.
3. Re-verify: `cd mobile-app && npx expo config --type public` shows `extra.eas.projectId` as the new UUID.
</easprojectid_wiring>

<workflow>
1. **Detect.** Run all the checks above; build the gap list. Show the user where they stand (logged in as? project linked?).
2. **Install/login gaps.** eas-cli + deps + `eas login` — idempotent, skip anything already done. Never re-login if `whoami` already resolves.
3. **Link the project** (only if `easProjectId` is a placeholder): confirm, `eas init`, then write the UUID into `site-config.ts` per the wiring above.
4. **Validate.** `npx expo-doctor` from `mobile-app/`. Report each finding; fix obvious config issues (version mismatches it names), surface the rest.
5. **Report.** Logged-in account, the linked `easProjectId`, expo-doctor result. Point next at `/ns ios local-setup` (local preview/builds on a Mac), `/ns ios testflight` (macOS local by default; Windows/Linux cloud), or `/ns android beta` (macOS local allowed; Windows/Linux cloud).
</workflow>

<rules>
- This is the Expo **account/platform** layer only. Local Mac toolchain → `/ns ios local-setup`; run loop → `/ns dev`; signing + build → `/ns ios setup` → `/ns ios testflight`.
- `easProjectId` lives in `site-config.ts` (read by `app.config.ts`). Write it there — never hardcode it into `app.json`/`app.config.ts`.
- Creating an EAS project is outward-facing → one explicit confirmation before `eas init`. Never create store/build resources or trigger a build here.
- Idempotent: skip login if `eas whoami` resolves; skip `eas init` if `easProjectId` is already a real UUID.
- Expo auth lives in eas-cli's own credential store — never commit an Expo token or write it to `.env`.
- Don't install eas-cli globally if `/ns doctor` will; prefer delegating the CLI install.
</rules>

<verification>
```bash
eas --version
eas whoami                                   # logged-in account
grep -m1 easProjectId site-config.ts         # real UUID, not xxxxxxxx-…
cd mobile-app && npx expo-doctor             # project health (run last)
```
Green path: signed in, `easProjectId` is a UUID, `expo-doctor` reports no issues. Then `/ns ios local-setup` on macOS for preview tooling, `/ns ios testflight` for TestFlight, or `/ns android beta` for Play internal builds.
</verification>
