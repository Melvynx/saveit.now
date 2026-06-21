---
name: ns-generate-store-screenshots
description: Generate App Store and Google Play screenshots for NowStack Mobile with an AI-assisted simulator/emulator workflow. Use when preparing store assets, App Review screenshots, Play listing screenshots, launch marketing captures, or when the user asks to automate mobile screenshots.
---

# Generate Store Screenshots - NowStack Mobile

<objective>
Create store-ready iOS and Android screenshots with as much automation as possible: define the screen list, drive the app in simulator/emulator, capture clean device screenshots, optionally wrap them in branded frames, run AI visual QA, and export assets for App Store Connect and Google Play.

This skill is part of the release pipeline. Screenshots are not a nice-to-have; they are a store submission gate.
</objective>

<when_to_use>
Use this workflow when:

- Preparing the first NowStack Mobile App Store or Google Play submission.
- Updating screenshots after UI, onboarding, paywall, auth, or branding changes.
- The user says: "create screenshots", "screenshots App Store", "screenshots Play Store", "automate screenshots", "avec l'IA", or asks for launch/store assets.
- Running `ns-deploy-ios-app` or `ns-deploy-android-app` and the store listing lacks fresh screenshots.

Do NOT use this for:

- Random debug screenshots with no store/listing purpose.
- Screenshots containing real personal data, tokens, private user content, or production customer data.
- Uploading store assets externally without explicit confirmation.
</when_to_use>

<automation_principle>
The goal is not "take a few screenshots by hand". The goal is an AI-assisted repeatable asset pipeline:

1. An agent reads the app config and produces a screenshot shot list.
2. The app runs with deterministic demo data.
3. A simulator/emulator is driven by a scripted flow when possible.
4. Screenshots are captured by native tooling.
5. An AI vision pass checks composition, copy, safe areas, blank states, broken UI, and secret leaks.
6. Assets are exported into a predictable folder for store upload.

Manual hand-capture is not the target path. Store screenshots should be generated, QA-checked, named, and made upload-ready by automation; manual work is allowed only as a documented fallback or final human approval gate.
</automation_principle>

<ninety_nine_percent_automation_architecture>
For a real 90-99% automation setup, treat screenshots as code and keep the capture pipeline in the repo:

1. **Use the safe dry-run-first wrapper before touching devices**
   - Run from `mobile-app/`: `npm run screenshots:store` to generate `documents/store-screenshots/<date>/manifest.json` and print the Maestro/`simctl`/`adb` commands without executing them.
   - Scope platforms with `npm run screenshots:store:ios` or `npm run screenshots:store:android`.
   - Only pass `-- --execute` after the app, simulator/emulator, and demo data are ready. The script never uploads screenshots and does not require store credentials.
   - Useful flags: `-- --date YYYY-MM-DD`, `-- --locale fr-FR`, `-- --output ../documents/store-screenshots/YYYY-MM-DD`, `-- --skip-maestro`, `-- --ios-device booted`, `-- --android-device emulator-5554`, `-- --continue-on-maestro-failure`.

2. **Maestro flows live under `mobile-app/maestro/store/`**
   - Start from `mobile-app/maestro/store/ios-store-screenshots.example.yaml` and `mobile-app/maestro/store/android-store-screenshots.example.yaml`.
   - Treat those full-platform examples as human-readable references. The wrapper's `--execute` path runs one Maestro flow per screenshot before taking that screenshot.
   - Prefer checked-in per-shot flows named `mobile-app/maestro/store/<platform>/<slot>-<slug>.yaml` or `mobile-app/maestro/store/<platform>-<slot>-<slug>.yaml`, e.g. `maestro/store/ios/01-onboarding.yaml`.
   - If a per-shot flow is missing, the wrapper generates a temporary flow under the output root `_maestro/` that launches the app by bundle/package id but opens `nowstack://<route>?storeDemo=1&seed=nowstack-store-demo-v1&locale=<locale>`, waits for animations, and asserts required visible text. Generated flows require real app deep-link/demo-mode support; failures are intentional release blockers.
   - Convert examples into real per-shot flows once stable test IDs/deep links exist.
   - Run `maestro test mobile-app/maestro/store/<flow>.yaml` from the repo root, or from `mobile-app` with the relative path adjusted.

3. **Deterministic demo mode replaces human setup**
   - The app should support a store-demo flag through launch arguments, env vars, or deep links, e.g. `STORE_SCREENSHOTS=1`, `STORE_DEMO_SEED=nowstack-store-demo-v1`, `STORE_LOCALE=fr-FR`.
   - Use seeded local/demo data, stable dates, fake-but-realistic names, fixed subscription state, and no network dependency unless the production backend is deliberately under test.
   - Prefer deep links such as `nowstack://store/home?storeDemo=1&seed=nowstack-store-demo-v1&locale=fr-FR` to jump directly to screenshot routes instead of clicking through long onboarding every run. `ns` comes from `SiteConfig.slug` / Expo `scheme`; `com.nowstack.mobile` remains the native bundle/package id used by Maestro `launchApp`.
   - Never require real credentials; use a demo bypass, mock auth state, or local seeded session that cannot access production customer data.

4. **Native device capture is scripted per platform**
   - iOS: `xcrun simctl io <device_udid|booted> screenshot <path>.png` after the per-shot Maestro flow reaches the expected state.
   - Android: `adb [-s <serial>] exec-out screencap -p > <path>.png` after the per-shot Maestro flow reaches the expected state.
   - Capture required device families in separate simulator/emulator profiles, e.g. iPhone 6.7", iPad if supported, Android phone, and Android tablet if supported.
   - Normalize output filenames by platform/device/locale/route: `ios/iphone-67/fr-FR/01-onboarding.png`.

5. **AI visual QA is manifest-driven**
   - Write `documents/store-screenshots/YYYY-MM-DD/manifest.json` using `docs/templates/store-screenshot-manifest.example.json` as the schema/example.
   - For every screenshot, include platform, device, locale, route, source flow, image path, required visible text, forbidden text, safe-area expectations, and QA status.
   - The AI vision pass reads the manifest and PNGs, then marks each item as pass/fail with reasons and fix instructions.
   - A screenshot is not upload-ready until its manifest entry passes: correct screen, readable copy, no clipped UI, no private data, no placeholders, no debug banners, no misleading claims.

6. **Optional frame/composite generation is a post-process**
   - Keep raw device screenshots untouched for compliance review.
   - If marketing-style screenshots are desired, generate framed/composited copies into `framed/` with overlay copy, device frames, and brand backgrounds.
   - Store manifests should point to both `rawPath` and `framedPath` when frames are generated.

7. **Upload integration comes after approval**
   - iOS upload candidate: `asc` for App Store Connect screenshots/metadata automation.
   - Android upload candidate: `gpc` for Google Play listings, screenshots, release notes, and track assets. Fastlane `supply` remains the fallback if `gpc` is blocked.
   - Do not upload assets automatically in this skill. Produce upload-ready files and a manifest, then wait for explicit user approval and the deploy skill.

8. **Manual remainder is explicit and small**
   - Apple/Google developer account verification and legal/business enrollment.
   - Initial app record/package creation when the console requires a human account owner.
   - Apple privacy/export compliance, Google Data Safety/content rating/target audience/app access declarations when they require business judgment.
   - Final App Review / Play review approval, rejection handling, and policy appeals.

This is the honest 99% line: preparation, navigation, capture, QA, naming, manifesting, and upload-ready packaging can be automated; platform account/compliance decisions and final approval cannot be truthfully eliminated.
</ninety_nine_percent_automation_architecture>

<state_variables>
Persist these values across the workflow:

| Variable | Type | Description |
| --- | --- | --- |
| `{app_name}` | string | App name from `SiteConfig.title`. |
| `{deep_link_scheme}` | string | Expo deep-link scheme from `SiteConfig.slug` / `mobile-app/app.config.ts`. |
| `{brand_primary}` | string | Primary color from `site-config.ts`. |
| `{ios_devices}` | list | Target iOS screenshot device families, usually iPhone 6.7" and iPad if supported. |
| `{android_devices}` | list | Target Android phone/tablet screenshot profiles. |
| `{shot_list}` | list | Ordered screens to capture. |
| `{demo_account}` | string | Demo login identity or bypass mode. Never include a real password in tracked files. |
| `{output_dir}` | string | Default: `documents/store-screenshots/<YYYY-MM-DD>/` or an untracked local folder. |
| `{upload_ready}` | boolean | True only after visual QA passes and user approves. |
</state_variables>

<critical_safety>
- Never capture real user data, secrets, tokens, emails from real inboxes, private media, or production customer content.
- Never commit generated screenshots unless the user explicitly asks to version them.
- Never commit demo credentials. Use local env, EAS secrets, or a documented manual login step.
- Do not upload screenshots to App Store Connect or Play Console without explicit user confirmation.
- Do not fake app capabilities in screenshots. Misleading claims are a store-review blocker.
</critical_safety>

<screenshot_spec>
Create a short shot list before touching simulators. For NowStack Mobile, the first version should usually include:

1. Onboarding / value proposition screen.
2. Auth screen with Apple/email sign-in visible.
3. Main dashboard or home feed with clean demo state.
4. Core feature screen that proves the product is not just another template.
5. Paywall/subscription screen.
6. Settings/account/privacy screen for trust/review.

For every shot, define:

- route or user flow to reach it
- required demo data
- text/copy overlay, if any
- device family
- pass/fail visual criteria
</screenshot_spec>

<recommended_tooling>
Default stack:

- Flow automation: Maestro flows under `mobile-app/maestro/store/`.
- Wrapper/manifest generator: `mobile-app/scripts/store-screenshots.mjs`, exposed as `npm run screenshots:store*` and dry-run by default.
- Deterministic app state: store-demo launch arguments, seeded data, stable dates, mock auth/demo session, and deep links.
- iOS capture: Xcode Simulator + `xcrun simctl io <udid|booted> screenshot`; pass `-- --ios-device <udid|booted>` to the wrapper.
- Android capture: Android Emulator + `adb [-s <serial>] exec-out screencap -p`; pass `-- --android-device <serial>` when multiple devices are connected.
- Visual QA: AI vision pass over generated PNGs and `manifest.json`.
- Optional framing: generate branded composites after raw captures pass QA.
- Store upload: produce approved upload-ready files first; later use `asc` for iOS or `gpc` for Android. Fastlane `supply` remains the Android fallback where needed.
</recommended_tooling>

<preflight>
Run from the repo root:

```bash
git status --short --branch
node --version
npm --version
cd mobile-app && npx expo config --type public
npm run screenshots:store -- --help
```

Then verify:

```text
site-config.ts
mobile-app/app.config.ts
mobile-app/package.json
mobile-app/app/
```

Confirm:

- App name, slug, Expo scheme, bundle/package and colors are final enough for screenshots.
- Generated deep links use the Expo `scheme` (`nowstack://...` by default), while Maestro `appId` uses the native bundle/package id (`com.nowstack.mobile` by default).
- Demo data path exists or can be created safely.
- Screens do not expose development placeholders.
- iOS/Android UI fits safe areas and notches.
- Paywall copy and pricing are legally/store-review acceptable.
</preflight>

<ios_capture_flow>
Use this as the baseline iOS capture flow:

```bash
cd mobile-app
npm run screenshots:store:ios -- --date YYYY-MM-DD --skip-maestro
npm run env:prod
npx expo prebuild --platform ios
npx expo run:ios
npm run screenshots:store:ios -- --date YYYY-MM-DD --execute --ios-device booted

# Human reference flow. The wrapper itself runs per-shot flows, generating temporary deep-link flows if needed.
maestro test maestro/store/ios-store-screenshots.example.yaml

# Native capture command used by scripted runners after each per-shot Maestro flow:
mkdir -p ../documents/store-screenshots/ios
xcrun simctl io booted screenshot ../documents/store-screenshots/ios/01-onboarding.png
```

The repo wrapper is `mobile-app/scripts/store-screenshots.mjs`. It writes the manifest in dry-run mode. In `--execute` mode it runs a per-shot Maestro flow before each native capture, prefers checked-in per-shot flows, otherwise generates temporary deep-link flows under `_maestro/`, and calls `xcrun simctl io <ios-device> screenshot` for each canonical shot. Maestro failures skip that shot's native capture and make the command exit non-zero unless `--continue-on-maestro-failure` is passed; native failures always exit non-zero.

Restore dev env when done if `env:prod` mutated local files:

```bash
npm run env:dev
```
</ios_capture_flow>

<android_capture_flow>
Use this as the baseline Android capture flow:

```bash
cd mobile-app
npm run screenshots:store:android -- --date YYYY-MM-DD --skip-maestro
npm run env:prod
npx expo prebuild --platform android
npx expo run:android
npm run screenshots:store:android -- --date YYYY-MM-DD --execute --android-device emulator-5554

# Human reference flow. The wrapper itself runs per-shot flows, generating temporary deep-link flows if needed.
maestro test maestro/store/android-store-screenshots.example.yaml

# Native capture command used by scripted runners after each per-shot Maestro flow:
mkdir -p ../documents/store-screenshots/android
adb -s emulator-5554 exec-out screencap -p > ../documents/store-screenshots/android/01-onboarding.png
```

The repo wrapper is `mobile-app/scripts/store-screenshots.mjs`. It writes the manifest in dry-run mode. In `--execute` mode it runs a per-shot Maestro flow before each native capture, prefers checked-in per-shot flows, otherwise generates temporary deep-link flows under `_maestro/`, and calls `adb [-s <android-device>] exec-out screencap -p` without shell redirection, writing stdout to the target PNG. Maestro failures skip that shot's native capture and make the command exit non-zero unless `--continue-on-maestro-failure` is passed; native failures always exit non-zero.

Restore dev env when done if needed:

```bash
npm run env:dev
```
</android_capture_flow>

<ai_visual_qa>
After screenshots are captured, run an AI visual QA pass. The reviewer should answer for each image:

- Is the screenshot non-empty and from the correct screen?
- Is any UI clipped by notch, home indicator, keyboard, or status bar?
- Is the copy readable at store thumbnail size?
- Is there any placeholder text, fake lorem ipsum, debug banner, local URL, or visible secret?
- Does the brand match `site-config.ts`?
- Would this screenshot pass App Store / Play policy review?

Fail the screenshot set if any answer reveals broken UI, misleading claims, or sensitive data.

Use `docs/templates/store-screenshot-manifest.example.json` as the starting shape for the QA manifest. The manifest should be machine-readable so an agent can perform deterministic checks first, then visual inspection second.
</ai_visual_qa>

<export_structure>
Write generated assets to an untracked folder by default:

```text
documents/store-screenshots/YYYY-MM-DD/
  manifest.json
  ios/
    iphone-67/fr-FR/01-onboarding.png
    iphone-67/fr-FR/02-auth.png
    iphone-67/fr-FR/03-home.png
    iphone-67/fr-FR/04-core-feature.png
    iphone-67/fr-FR/05-paywall.png
    iphone-67/fr-FR/06-settings.png
  android/
    phone/fr-FR/01-onboarding.png
    phone/fr-FR/02-auth.png
    phone/fr-FR/03-home.png
    phone/fr-FR/04-core-feature.png
    phone/fr-FR/05-paywall.png
    phone/fr-FR/06-settings.png
```

`manifest.json` should include device, OS, app version, git SHA, route/flow, and QA status for each screenshot.
</export_structure>

<integration_with_store_deploy>
`ns-deploy-ios-app` and `ns-deploy-android-app` must treat screenshots as a release gate:

- If screenshots are missing, run this skill before submission.
- If screenshots are stale relative to UI/paywall/branding changes, regenerate them.
- If AI visual QA fails, fix the UI/data/shot and recapture.
- Only upload approved screenshots.
</integration_with_store_deploy>

<failure_modes>
- Simulator/emulator shows a blank screen: Metro/backend/env is not ready, or production Convex URL is wrong.
- Screenshots show development placeholders: `site-config.ts`, demo data, or env swap is incomplete.
- Paywall screenshot fails review: price/IAP type/copy conflicts with App Store or Play policy.
- Automation is flaky: add stable test IDs or route/deep-link entry points before trying to brute-force clicks.
- AI QA flags private data: delete the screenshot set, fix demo data, regenerate.
</failure_modes>

<success_metrics>
- Screenshot manifest exists and references every required store shot.
- iOS and Android PNGs are generated in predictable folders.
- AI visual QA passes with no secret/data leakage.
- User approved the screenshot set before any store upload.
- Deployment skills can proceed without a missing-screenshot blocker.
</success_metrics>
