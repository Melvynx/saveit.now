---
name: ns-deploy-ios-app
description: One-shot NowStack Mobile iOS deployment with asc App Store Connect CLI. Use when preparing TestFlight/App Store releases, uploading IPAs, syncing screenshots/metadata, validating review readiness, or submitting the iOS app without EAS Submit.
---

# Deploy iOS App - NowStack Mobile

<objective>
Ship NowStack Mobile to App Store Connect with `asc` as the default Apple deployment tool.

This skill does not use EAS Submit for Apple uploads. The target flow is:

1. Build or obtain a signed production `.ipa`.
2. Authenticate `asc` with App Store Connect.
3. Use `asc` to resolve the app, upload/publish the build, sync screenshots/metadata where possible, validate readiness, and submit.

EAS may appear only as an optional fallback to produce an `.ipa` if the user explicitly asks for it. App Store Connect automation belongs to `asc`.
</objective>

<when_to_use>
Use this workflow when:

- Shipping NowStack Mobile to TestFlight or App Review.
- Preparing the first iOS App Store release.
- Re-running an iOS submit after metadata, screenshots, IAP, privacy, or build changes.
- The user says: "deploy iOS", "publish iOS", "submit to App Store", "use asc", "asccli", "App Store Connect CLI", or asks for the iOS store deployment skill.

Do NOT use this for:

- Android/Google Play submissions (use `ns-deploy-android-app`).
- Local simulator/dev builds (`npm run ios`, `npx expo start`).
- EAS Submit unless the user explicitly overrides this skill.
- Creating or submitting real App Store resources without a dry run and explicit confirmation.
</when_to_use>

<state_variables>
Persist these values across the workflow:

| Variable | Type | Description |
| --- | --- | --- |
| `{app_name}` | string | App name from `SiteConfig.title` / Expo config. |
| `{slug}` | string | Expo slug and URL scheme from `SiteConfig.slug`. |
| `{bundle_id}` | string | iOS bundle identifier from `SiteConfig.bundleId` and `ios.bundleIdentifier`. |
| `{apple_team_id}` | string | Apple Developer Team ID from `SiteConfig.appleTeamId`. |
| `{app_store_app_id}` | string | Numeric App Store Connect app ID / Apple ID. |
| `{version}` | string | App Store version string, usually from `mobile-app/package.json` / Expo config. |
| `{build_id}` | string | App Store Connect build ID after upload/processing. |
| `{ipa_path}` | string | Signed production `.ipa` path to upload. |
| `{convex_prod_url}` | string | Production Convex cloud URL for `EXPO_PUBLIC_CONVEX_URL`. |
| `{convex_prod_site_url}` | string | Production Convex site URL for `EXPO_PUBLIC_CONVEX_SITE_URL`. |
| `{iap_product_id}` | string | Apple IAP product ID from `SiteConfig.payment.iapProductId`. |
| `{asc_key_id}` | string | App Store Connect API key ID. Secret metadata; do not commit. |
| `{asc_issuer_id}` | string | App Store Connect API issuer ID. Secret metadata; do not commit. |
| `{asc_p8_path}` | string | Local path to the `.p8` API private key. Never commit. |
| `{dry_run}` | boolean | If true, print plans and run dry-run commands only. |
</state_variables>

<critical_safety>
- Never commit App Store Connect `.p8` keys, Apple account passwords, app-specific passwords, certificates, provisioning profiles, export option files with secrets, or `.env` files containing secrets.
- Never print full secret values. Mask key IDs, issuer IDs, tokens, and file paths when summarizing.
- Do not run `asc publish appstore --submit --confirm`, `asc review submit --confirm`, or any `asc web ... --confirm` command until the user explicitly confirms the app ID, bundle ID, Apple team, version, IPA path, production Convex URLs, screenshots, metadata, and IAP product.
- Prefer `asc` dry runs and validation before mutation.
- Treat `asc web ...` commands as optional escape hatches for App Store Connect web-only gaps. Use them only when the user is knowingly operating with their Apple session.
</critical_safety>

<preflight>
Run these checks from the repository root unless noted. Stop if deploy-relevant state is dirty or placeholders would ship.

```bash
gh repo view --json nameWithOwner,defaultBranchRef || true

git status --short --branch
node --version
npm --version
command -v asc && asc version
asc auth status --validate || asc auth doctor || true
cd mobile-app && npx expo config --type public
```

Read and verify these files:

```text
site-config.ts
mobile-app/app.config.ts
mobile-app/package.json
mobile-app/lib/iap.ts
convex/payments/iap.ts
docs/templates/app-store-metadata.example.json
docs/templates/store-screenshot-manifest.example.json
```

Confirm:

- `SiteConfig.bundleId` equals `ios.bundleIdentifier` in generated Expo config.
- `SiteConfig.slug` equals the Expo scheme used by screenshot/deep-link automation.
- `SiteConfig.appleTeamId` belongs to the intended Apple Developer team.
- `SiteConfig.easProjectId` being placeholder is not a blocker if this flow is not using EAS.
- Production Convex URLs are known before the IPA is built.
- `SiteConfig.payment.iapProductId`, StoreKit config, and `convex/payments/iap.ts` are aligned.
- Screenshots exist, are fresh, and passed AI visual QA.
- App Store metadata/review details/privacy/IAP status are ready enough for `asc validate`.
</preflight>

<install_and_auth>
If `asc` is missing, install it:

```bash
brew install asc
```

or:

```bash
curl -fsSL https://asccli.sh/install | bash
```

If `{asc_key_id}`, `{asc_issuer_id}`, or `{asc_p8_path}` are unknown, run the `ns-find-asc-credentials` skill first — it locates `.p8` keys on disk, reads the issuer ID from the user's signed-in browser session (App Store Connect web UI, via dev-browser CDP), and verifies the key is active before login.

Authenticate with an App Store Connect API key:

```bash
asc auth login \
  --name "NowStack" \
  --key-id "KEY_ID" \
  --issuer-id "ISSUER_ID" \
  --private-key "/secure/local/AuthKey_KEY_ID.p8" \
  --network
```

For CI/headless shells where keychain access is not available:

```bash
asc auth login \
  --bypass-keychain \
  --name "NowStack CI" \
  --key-id "KEY_ID" \
  --issuer-id "ISSUER_ID" \
  --private-key "/secure/local/AuthKey_KEY_ID.p8"
```

Then validate:

```bash
asc auth status --validate
asc auth doctor
asc apps list --output table
```
</install_and_auth>

<app_store_connect_setup>
Use `asc` as the Apple control plane:

- `asc apps list --output table` to resolve `{app_store_app_id}`.
- `asc status --app "{app_store_app_id}" --output table` for release state.
- `asc localizations list --app "{app_store_app_id}"` for metadata/localization status.
- `asc screenshots list --app "{app_store_app_id}"` for store media status.
- `asc validate --app "{app_store_app_id}" --version "{version}" --platform IOS --output table` for readiness.
- `asc validate iap --app "{app_store_app_id}" --output table` when IAP is enabled.
- `asc validate subscriptions --app "{app_store_app_id}" --output table` if subscriptions are used.

Manual or web-session gates that may still exist:

- Apple Developer enrollment and team/legal agreements.
- First app record creation if no public/API path is available for the current account.
- App Privacy publish state if public API validation cannot prove it.
- First-review IAP selection if Apple requires selecting the IAP on the app-version page.
</app_store_connect_setup>

<metadata_and_screenshot_automation>
Before binary publish or review submission, run `.agents/skills/ns-generate-store-screenshots` and require its manifest to be upload-ready.

Automation target:

- `ns-generate-store-screenshots` creates iOS PNGs and `manifest.json`.
- `docs/templates/app-store-metadata.example.json` remains the repo source template for copy/review details.
- `asc` is the preferred tool for App Store Connect metadata, localizations, screenshots, build upload, validation, and submission.
- Keep raw screenshots separate from framed marketing screenshots. Upload only the user-approved set.
</metadata_and_screenshot_automation>

<build_ipa>
This skill needs a signed production `.ipa`. Prefer local/Xcode or Xcode Cloud when the user wants no EAS.

Local Expo/Xcode path:

```bash
cd mobile-app
npm run env:prod
npx expo prebuild --clean --platform ios
```

Then archive/export with Xcode or `xcodebuild`. Keep `ExportOptions.plist` and signing material free of secrets and confirm the exact workspace/scheme before running destructive clean/archive steps.

Optional Xcode Cloud path:

```bash
asc xcode-cloud run --app "{app_store_app_id}" --workflow "CI" --branch "main" --wait
```

Optional fallback only if the user explicitly allows EAS for build artifact generation:

```bash
cd mobile-app
npm run env:prod
npx eas build --platform ios --profile production --non-interactive
```

Do not use `npx eas submit`. Once the `.ipa` exists, deployment continues with `asc`.
</build_ipa>

<asc_publish_flow>
Before any mutation, run a dry run:

```bash
asc publish appstore \
  --app "{app_store_app_id}" \
  --ipa "{ipa_path}" \
  --version "{version}" \
  --submit \
  --dry-run \
  --output table
```

If the dry run is clean and the user confirms:

```bash
asc publish appstore \
  --app "{app_store_app_id}" \
  --ipa "{ipa_path}" \
  --version "{version}" \
  --submit \
  --confirm
```

Add `--wait` when the command should wait for build processing before attaching/submitting:

```bash
asc publish appstore \
  --app "{app_store_app_id}" \
  --ipa "{ipa_path}" \
  --version "{version}" \
  --submit \
  --wait \
  --confirm
```

If the user wants a checkpoint before review submission, stage first:

```bash
asc release stage \
  --app "{app_store_app_id}" \
  --version "{version}" \
  --build "{build_id}" \
  --metadata-dir "./metadata/version/{version}" \
  --dry-run \
  --output table

asc release stage \
  --app "{app_store_app_id}" \
  --version "{version}" \
  --build "{build_id}" \
  --metadata-dir "./metadata/version/{version}" \
  --confirm
```

Then submit explicitly:

```bash
asc review submit --app "{app_store_app_id}" --version "{version}" --build "{build_id}" --dry-run --output table
asc review submit --app "{app_store_app_id}" --version "{version}" --build "{build_id}" --confirm
```
</asc_publish_flow>

<post_submit_checklist>
After `asc publish appstore` or `asc review submit` succeeds:

- Run `asc status --app "{app_store_app_id}" --output table`.
- Run `asc submit status --version-id "{version_id}"` or `asc submit status --id "{submission_id}"` if available.
- Confirm the build appears in TestFlight/App Store Connect.
- Resolve processing, export compliance, App Privacy, age rating, pricing/availability, screenshot, review-detail, IAP, or subscription warnings.
- Test Apple Sign In, onboarding, Convex connectivity, paywall, purchase restore/finish behavior, and account deletion.
- Record the app ID, version, build ID, submission ID, IPA path, release notes, and `asc` command outputs in the release summary.
- Restore dev env if `npm run env:prod` changed local files:

```bash
cd mobile-app
npm run env:dev
```
</post_submit_checklist>

<failure_modes>
- `asc` is missing: install with `brew install asc` or the install script.
- `asc auth status --validate` fails: API key ID, issuer ID, private key path, keychain storage, or network access is wrong.
- Build uploads to the wrong app: `{app_store_app_id}`, bundle ID, or Apple team is mismatched.
- `asc publish appstore` cannot attach/submit: build processing is incomplete; rerun with `--wait` or monitor with `asc status`.
- `asc validate` blocks submission: fix metadata, screenshots, review details, content rights, encryption, app availability, App Privacy, IAP, or subscription readiness.
- App Review rejects payments: iOS production uses Stripe instead of Apple IAP, or IAP/subscription products are incomplete.
- First-review IAP/subscription gaps: use `asc validate iap`, `asc validate subscriptions`, and the relevant attach/review commands; some first-time selections may still require App Store Connect UI or `asc web ...` with user approval.
- Production app points at dev backend: the IPA was built before production Convex URLs were set.
- Credentials leak risk: `.p8`, passwords, app-specific passwords, or signing materials were stored in tracked files.
</failure_modes>

<success_metrics>
- A signed production `.ipa` exists for the intended bundle ID/team.
- `asc auth status --validate` succeeds.
- `asc publish appstore --dry-run` or `asc review submit --dry-run` is clean before mutation.
- `asc publish appstore --submit --confirm` or `asc review submit --confirm` completes for the intended app/version.
- App Store Connect/TestFlight shows the build under the intended app/version.
- IAP product ID, bundle ID, Convex prod URLs, privacy/support URLs, screenshots, review details, and metadata are aligned.
- No secrets are committed or printed.
</success_metrics>
