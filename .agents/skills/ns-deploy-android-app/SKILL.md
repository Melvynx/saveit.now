---
name: ns-deploy-android-app
description: One-shot NowStack Mobile Android deployment with GPC Google Play Console CLI. Use when preparing Play Store releases, uploading AABs, syncing listings/screenshots, monitoring rollout health, or submitting Android without EAS Submit.
---

# Deploy Android App - NowStack Mobile

<objective>
Ship NowStack Mobile to Google Play with **GPC / Google Play Console CLI** as the default Android deployment tool.

This skill does not use EAS Submit for Android uploads. The target flow is:

1. Build or obtain a signed production `.aab`.
2. Authenticate `gpc` with a Google Play service account.
3. Run `gpc preflight` / `gpc validate`.
4. Upload to the internal track with `gpc publish` or `gpc releases upload`.
5. Monitor, promote, halt, or roll out with `gpc status`, `gpc watch`, and `gpc releases promote`.

Fastlane `supply` remains the stable fallback if `gpc` is blocked. Build artifact generation is OS-aware: macOS may use local Gradle or local EAS, while Windows/Linux must load `ns-setup-expo` and use EAS cloud to produce the `.aab`. Google Play automation belongs to `gpc`.
</objective>

<when_to_use>
Use this workflow when:

- Shipping NowStack Mobile to Google Play.
- Creating an Android production build for internal, closed, open, or production tracks.
- Re-running Android deployment after package name, signing, service account, listing, screenshot, or production env changes.
- The user says: "deploy Android", "publish to Play Store", "Google Play one shot", "use gpc", "equivalent asc Android", or asks for the Android store deployment skill.

Do NOT use this for:

- iOS/App Store submissions (use `ns-ios-deploy-app`).
- Local emulator/dev builds (`npm run android`, `npx expo start`).
- EAS Submit unless the user explicitly overrides this skill.
- Creating or submitting real Google Play resources without a dry run/validation and explicit confirmation.
</when_to_use>

<state_variables>
Persist these values across the workflow:

| Variable | Type | Description |
| --- | --- | --- |
| `{app_name}` | string | App name from `SiteConfig.title` / Expo config. |
| `{slug}` | string | Expo slug from `SiteConfig.slug`. |
| `{package_name}` | string | Android package name from `SiteConfig.bundleId` and `android.package`. |
| `{aab_path}` | string | Signed production `.aab` path to upload. |
| `{convex_prod_url}` | string | Production Convex cloud URL for `EXPO_PUBLIC_CONVEX_URL`. |
| `{convex_prod_site_url}` | string | Production Convex site URL for `EXPO_PUBLIC_CONVEX_SITE_URL`. |
| `{google_play_track}` | string | Initial target track: usually `internal`, then `closed`, `open`, or `production`. |
| `{service_account_json_path}` | string | Local path to Google Play service account JSON. Never commit. |
| `{release_status}` | string | Usually `draft` or `completed`, depending on the track/review plan. |
| `{rollout_fraction}` | number | Production staged rollout fraction, if promoting beyond testing. |
| `{dry_run}` | boolean | If true, print plans and run dry-run/validate-only commands only. |
</state_variables>

<critical_safety>
- Never commit Google service account JSON, upload keystores, passwords, `.env` files, signing configs containing secrets, App Store `.p8` keys, or any credential material.
- Never print full service account contents or private keys. Mask paths and identifiers in summaries.
- Do not run `gpc publish`, `gpc releases upload`, `gpc releases promote`, or `gpc listings push` without validation and explicit confirmation of package name, Google Play account, service account, track, production Convex URLs, screenshots/listing, and release notes.
- Prefer `gpc preflight`, `gpc validate`, `gpc publish --validate-only`, and `--dry-run` before mutation.
- Keep Android payments aligned with repo policy: Android/web use Stripe, iOS production uses Apple IAP.
</critical_safety>

<preflight>
Run these checks from the repository root unless noted. Stop if deploy-relevant state is dirty or placeholders would ship.

```bash
gh repo view --json nameWithOwner,defaultBranchRef || true

git status --short --branch
node --version
npm --version
command -v gpc && gpc --version
gpc doctor || true
cd mobile-app && npx expo config --type public
```

Read and verify these files:

```text
site-config.ts
mobile-app/app.config.ts
mobile-app/package.json
docs/templates/google-play-release.example.json
docs/templates/store-screenshot-manifest.example.json
```

Confirm:

- `SiteConfig.bundleId` equals `android.package` in generated Expo config.
- Production Convex URLs are known before the `.aab` is built.
- Google Play Console app exists for `{package_name}`.
- If this is a brand-new Google Play app/package, the initial Play Console/API bootstrap state is understood. Google Play API based tools commonly require the app/package and first setup to exist before fully automated uploads work.
- Play App Signing and upload key/signing config are ready.
- Service account is linked to Play Console and has app-scoped release/listing permissions.
- Screenshots exist, are fresh, and passed AI visual QA.
- Store listing, release notes, data safety, content rating, target audience, ads declaration, app access, and privacy policy are ready enough for validation.
- Android payment path uses Stripe with production publishable key and Convex-held Stripe server secrets.
</preflight>

<install_and_auth>
If `gpc` is missing, install it:

```bash
npm install -g @gpc-cli/cli
```

or:

```bash
brew install yasserstudio/tap/gpc
```

or standalone:

```bash
curl -fsSL https://raw.githubusercontent.com/yasserstudio/gpc/main/scripts/install.sh | sh
```

Authenticate:

```bash
gpc setup
gpc auth login --service-account "/secure/local/google-play-service-account.json"
gpc doctor
```

For CI, use env-based auth:

```bash
export GPC_SERVICE_ACCOUNT="/secure/local/google-play-service-account.json"
export GPC_APP="{package_name}"
gpc doctor --json
```
</install_and_auth>

<google_play_setup>
Use `gpc` as the Google Play control plane:

- `gpc doctor` for auth/config/connectivity checks.
- `gpc status` for release, vitals, and review overview.
- `gpc preflight "{aab_path}"` for offline compliance checks before upload.
- `gpc validate "{aab_path}" --track "{google_play_track}"` or `gpc publish "{aab_path}" --track "{google_play_track}" --validate-only` before mutation.
- `gpc releases upload "{aab_path}" --track "{google_play_track}"` for artifact upload.
- `gpc publish "{aab_path}" --track "{google_play_track}" --notes "..."` for the higher-level release flow.
- `gpc listings pull --dir metadata/` and `gpc listings push --dir metadata/` for store listing sync.
- `gpc listings images upload --lang fr-FR --type phoneScreenshots ./documents/store-screenshots/.../*.png` for screenshot upload where appropriate.
- `gpc releases promote --from internal --to production --rollout 10` for staged promotion after testing.
- `gpc watch --track production --on-breach halt` for rollout monitoring.

Manual gates that may still exist:

- Developer account verification and organization/personal account policy steps.
- Initial app/package creation and first Play Console setup if the API cannot bootstrap it for the account state.
- Data Safety, content rating, target audience, ads, app access, privacy-policy, and final review approval when business judgment is required.
</google_play_setup>

<metadata_and_screenshot_automation>
Before binary publish or Play listing upload, run `.agents/skills/ns-generate-store-screenshots` and require its manifest to be upload-ready.

Automation target:

- `ns-generate-store-screenshots` creates Android PNGs and `manifest.json`.
- `docs/templates/google-play-release.example.json` remains the repo source template for release notes, listing copy, and graphics.
- `gpc` is the preferred tool for Play listing metadata, screenshots, release upload, validation, promotion, monitoring, vitals, reviews, and subscriptions/IAP where needed.
- Keep raw screenshots separate from framed marketing screenshots. Upload only the user-approved set.
</metadata_and_screenshot_automation>

<build_aab>
This skill needs a signed production `.aab`. Detect the OS before choosing the build path:

```bash
uname -s || node -p "process.platform"
```

- **macOS / Darwin**: local Android production builds are allowed. Prefer local Gradle when the user wants no EAS, or local EAS when the repo is already configured for EAS-managed signing.
- **Windows/Linux**: do not attempt local Android production builds. Load/follow `.agents/skills/ns-setup-expo/SKILL.md`, verify `eas-cli`, `eas whoami`, linked `easProjectId`, and `expo-doctor`, then use EAS cloud to produce the `.aab`.

Local Expo/Gradle path:

```bash
cd mobile-app
npm run env:prod
npx expo prebuild --clean --platform android
cd android
./gradlew bundleRelease
```

Expected output path is usually:

```text
mobile-app/android/app/build/outputs/bundle/release/app-release.aab
```

Stop if signing is not configured for release. Do not invent keystore credentials or write secrets into tracked Gradle files.

macOS local EAS path, when avoiding cloud credits but using EAS-managed signing:

```bash
cd mobile-app
npm run env:prod
npx eas-cli@latest build --platform android --profile production \
  --local --non-interactive --output /tmp/{slug}.aab
```

Windows/Linux required cloud path, and optional macOS fallback if the user explicitly allows EAS cloud for build artifact generation:

```bash
cd mobile-app
npm run env:prod
npx eas build --platform android --profile production --non-interactive
```

Do not use `npx eas submit`. Once the `.aab` exists, deployment continues with `gpc`.
</build_aab>

<gpc_publish_flow>
Before any mutation, run local/offline and server-side validation:

```bash
gpc preflight "{aab_path}" --fail-on error
gpc publish "{aab_path}" --track "{google_play_track}" --validate-only
```

If the command surface supports dry run in the installed version, run it before upload:

```bash
gpc releases upload "{aab_path}" --track "{google_play_track}" --dry-run
```

After validation passes and the user confirms:

```bash
gpc releases upload "{aab_path}" --track internal
gpc status
```

or use the high-level publish flow:

```bash
gpc publish "{aab_path}" --track internal --notes "Initial internal test release"
gpc status
```

After internal validation, promote deliberately:

```bash
gpc releases promote --from internal --to closed
gpc releases promote --from closed --to production --rollout 10
gpc watch --track production --on-breach halt
```
</gpc_publish_flow>

<fallback_fastlane_supply>
Use fastlane `supply` only if GPC is unavailable or blocked.

Install/setup:

```bash
bundle add fastlane
bundle exec fastlane supply init
bundle exec fastlane run validate_play_store_json_key json_key:"/secure/local/google-play-service-account.json"
```

Validate/upload:

```bash
bundle exec fastlane supply \
  --aab "{aab_path}" \
  --track internal \
  --json_key "/secure/local/google-play-service-account.json" \
  --validate_only true

bundle exec fastlane supply \
  --aab "{aab_path}" \
  --track internal \
  --json_key "/secure/local/google-play-service-account.json"
```
</fallback_fastlane_supply>

<post_submit_checklist>
After `gpc publish` or `gpc releases upload` succeeds:

- Run `gpc status`.
- Confirm the artifact appears in the intended Google Play track.
- Resolve Play Console warnings for data safety, content rating, app access, target audience, ads, permissions, and privacy policy.
- Add testers and validate install from Google Play internal testing.
- Test Google/email auth, Convex connectivity, paywall, Stripe PaymentSheet, account deletion, media permissions, and deep links.
- Promote from internal to closed/open/production only after test validation.
- Monitor rollout health with `gpc watch` and halt if crash/ANR thresholds breach.
- Record package name, track, AAB path, version code, release notes, and `gpc` command outputs in the release summary.
- Restore dev env if `npm run env:prod` changed local files:

```bash
cd mobile-app
npm run env:dev
```
</post_submit_checklist>

<failure_modes>
- `gpc` is missing: install with npm, Homebrew, or standalone script.
- `gpc doctor` fails: service account JSON is missing, invalid, not linked to Play Console, lacks app permissions, or `GPC_APP` is wrong.
- First Android API upload fails: the Play app/package or initial console setup is incomplete. Finish the Play Console bootstrap, then retry GPC.
- Upload rejected because package name differs from Play Console app or was reserved by another app.
- Upload rejected because Play App Signing/upload key is misconfigured.
- `gpc preflight` blocks upload: fix restricted permissions, target SDK, debuggable/exported flags, secrets, non-Play billing SDKs, privacy/tracking, Families/COPPA, size, or listing requirements.
- Store listing blocks rollout: data safety, privacy policy, app access, ads, target audience, or content rating is incomplete.
- Android payments fail: Stripe production publishable key or Convex Stripe secrets are missing.
- Production app points at dev backend: the `.aab` was built before production Convex URLs were set.
- Credentials leak risk: service account JSON, keystores, or passwords were stored in tracked files.
</failure_modes>

<success_metrics>
- A signed production `.aab` exists for the intended package name.
- `gpc doctor` succeeds.
- `gpc preflight` and `gpc publish --validate-only` pass before mutation.
- `gpc publish` or `gpc releases upload` uploads to the intended Google Play track.
- Google Play Console shows the release under the intended app/package.
- Stripe Android payment path, Convex prod URLs, privacy/support URLs, screenshots, listing metadata, and Play compliance forms are aligned.
- No secrets are committed or printed.
</success_metrics>
