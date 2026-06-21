---
name: ns-ios-distribute
description: Make a NowStack Mobile iOS app ready for the App Store and submit for review - screenshots, metadata, IAP, age rating, demo account, validation, submit. Use for "deploy my app", "release on the App Store", "submit for review", or "make my app ready".
---

# iOS Distribute - NowStack Mobile

Take a TestFlight-ready app all the way to App Store review submission: store screenshots, metadata, IAP pricing/availability, age rating, review details with demo account, validation, and submit. If no build is on TestFlight yet, run `ns-ios-testflight` first.

<objective>
Orchestrate the full App Store distribution after a build is on TestFlight. This is the proven end-to-end flow (battle-tested on a real app built from this boilerplate, reaching zero `asc validate` errors): screenshots → store version + metadata → IAP readiness → compliance → review details → validate → submit.

Everything runs with repo tools and public CLIs only:
- `mobile-app/scripts/asc-api.mjs` for all App Store Connect API calls (`ASC_KEY_ID`/`ASC_ISSUER_ID`/`ASC_P8_PATH` env vars).
- `asc` CLI for uploads (screenshots, subscription assets) and validation.
- `mobile-app/scripts/store-screenshots.mjs` + Maestro + `xcrun simctl` for captures.

Sequencing with the rest of the lifecycle:
1. No processed build yet → run the `ns-ios-testflight` skill first.
2. Screenshot capture details → `.agents/skills/ns-generate-store-screenshots/SKILL.md`.
3. This file — version, metadata, IAP, compliance, review, submit.
For deep platform specifics use `.agents/skills/ns-deploy-ios-app/SKILL.md` / `.agents/skills/ns-deploy-android-app/SKILL.md`.
</objective>

<state_variables>
| Variable | Source |
| --- | --- |
| `{asc_app_id}` | `GET /v1/apps?filter[bundleId]={bundle_id}` |
| `{version_id}` | the `appStoreVersions` id in `PREPARE_FOR_SUBMISSION` |
| `{version_loc_id}` | en-US `appStoreVersionLocalizations` id |
| `{app_info_id}` / `{app_info_loc_id}` | from `GET /v1/apps/{asc_app_id}/appInfos` (+ its localizations) |
| `{build_db_id}` | processed build id from `GET /v1/builds?filter[app]={asc_app_id}` |
| `{subscription_id}` / `{sub_group_id}` | if the app sells a subscription |
| `{screenshots_dir}` | dated output of the screenshot run, e.g. `documents/store-screenshots/<date>/ios/iphone-67/en-US` |
</state_variables>

<critical_safety>
- Every mutation against App Store Connect is externally visible. Confirm with the user before: uploading screenshots, changing pricing/availability, and ABOVE ALL the final review submission.
- Never print or commit ASC credentials. `documents/store-screenshots/` is gitignored — keep it that way.
- Screenshots must contain only demo data (the seeded demo account), never real user content.
- Metadata values (URLs, support email, price) come from `site-config.ts` — do not invent them.
</critical_safety>

<asc_entity_map>
App Store Connect data model — knowing which entity owns which field saves hours:

| Field | Entity | Endpoint |
| --- | --- | --- |
| description, keywords, promotionalText, supportUrl, marketingUrl | appStoreVersionLocalizations | `PATCH /v1/appStoreVersionLocalizations/{id}` |
| subtitle, privacyPolicyUrl | appInfoLocalizations | `PATCH /v1/appInfoLocalizations/{id}` |
| primaryCategory | appInfos | `PATCH /v1/appInfos/{id}` (relationships) |
| copyright, release type | appStoreVersions | `PATCH /v1/appStoreVersions/{id}` |
| attached build | appStoreVersions relationship | `PATCH /v1/appStoreVersions/{id}/relationships/build` |
| age rating answers | ageRatingDeclarations | `PATCH /v1/ageRatingDeclarations/{id}` |
| contact + demo account | appStoreReviewDetails | `POST /v1/appStoreReviewDetails` |
| content rights | apps | `asc apps update --id {asc_app_id} --content-rights ...` |
</asc_entity_map>

<phase n="A" title="Preflight">
```bash
export ASC_KEY_ID=... ASC_ISSUER_ID=... ASC_P8_PATH=...
asc auth status --validate
node mobile-app/scripts/asc-api.mjs GET "/v1/apps?filter[bundleId]={bundle_id}"   # -> {asc_app_id}
node mobile-app/scripts/asc-api.mjs GET "/v1/builds?filter[app]={asc_app_id}&limit=3"
```

- No processed build → run the `ns-ios-testflight` skill first.
- Resolve `{version_id}`: `GET /v1/apps/{asc_app_id}/appStoreVersions?filter[appStoreState]=PREPARE_FOR_SUBMISSION`. If none exists, create it: `POST /v1/appStoreVersions` with `{platform: "IOS", versionString: "<version>"}` + app relationship.
- Read `site-config.ts`: urls (website/privacy/terms), support email, payment product IDs, price.
- The web app must be LIVE (privacy + terms URLs are review gates) — if not, stop and point to `docs/production-checklist.md` stage 2.
</phase>

<phase n="B" title="Store screenshots">
Follow `.agents/skills/ns-generate-store-screenshots/SKILL.md` for the full workflow. The proven recipe:

1. **Demo data**: create/verify a seed function (e.g. `convex/seedStoreDemo.ts`, app-specific) so screens show rich, realistic content. Sign in with the built-in review account `appstoretest@email.com` / OTP `123456`.
2. **Paywall capture**: temporarily set `EXPO_PUBLIC_ALLOW_DEV_PAYMENT_BYPASS=false` so the real paywall renders (restore afterwards).
3. **Device**: iPhone 14 Plus simulator → native 1284x2778 = Apple display type `IPHONE_65` (the 6.7" set, required for iPhone listings):

```bash
xcrun simctl create "store-iphone-65" "com.apple.CoreSimulator.SimDeviceType.iPhone-14-Plus" <runtime>
cd mobile-app && npm run screenshots:store:ios            # dry-run first, always
npm run screenshots:store:ios -- --execute                # after user confirms
```

4. Maestro flows live in `mobile-app/maestro/store/` (Maestro needs JDK 17: `export JAVA_HOME=/opt/homebrew/opt/openjdk@17`). Robust flow patterns: `extendedWaitUntil: {visible: "<text>", timeout: 10000}` before every tap; conditional paywall dismissal with `runFlow: when: visible:`.
5. **Validate**: `sips -g pixelWidth -g pixelHeight *.png` — every file must be exactly 1284x2778. Then visual QA each PNG (read the images): no dev overlays, no status-bar clutter, no placeholder copy.
</phase>

<phase n="C" title="Version, build, metadata">
```bash
# attach the processed build to the version
node -e "require('fs').writeFileSync('/tmp/build-rel.json',JSON.stringify({data:{type:'builds',id:'{build_db_id}'}}))"
node mobile-app/scripts/asc-api.mjs PATCH /v1/appStoreVersions/{version_id}/relationships/build /tmp/build-rel.json
```

Write metadata (draft it from `docs/templates/app-store-metadata.example.json` + `site-config.ts`, show the user for approval first):

- `PATCH /v1/appStoreVersionLocalizations/{version_loc_id}` — description (append `Terms of Use: <terms-url>` and `Privacy Policy: <privacy-url>` at the end — Apple requires visible terms for subscription apps), keywords (100 chars max, comma-separated, no spaces after commas), promotionalText, supportUrl, marketingUrl.
- `PATCH /v1/appInfoLocalizations/{app_info_loc_id}` — subtitle (30 chars max), privacyPolicyUrl.
- `PATCH /v1/appInfos/{app_info_id}` — primaryCategory relationship (e.g. `{"type":"appCategories","id":"LIFESTYLE"}`).
- `PATCH /v1/appStoreVersions/{version_id}` — copyright (`<year> <company name>`).

Upload screenshots:

```bash
asc screenshots upload --version-localization "{version_loc_id}" \
  --path "{screenshots_dir}" --device-type "IPHONE_65"
```
</phase>

<phase n="D" title="IAP / subscription readiness" optional="skip if the app sells nothing on iOS">
The product/subscription must exist in App Store Connect with the EXACT id from `site-config.ts > payment.productIds.apple`.

```bash
# names + descriptions testers/reviewers see
asc subscriptions groups localizations create --group {sub_group_id} --locale en-US --name "<group display name>"
asc subscriptions localizations create --subscription-id {subscription_id} --app {asc_app_id} \
  --locale en-US --name "<plan name>" --description "<one-line benefit>"

# pricing: set one base price, propagate everywhere
asc subscriptions pricing equalize --subscription-id {subscription_id} \
  --base-price "<price>" --base-territory "<ISO3>" --confirm

# availability: if "app availability not found", initialize via the v2 API with ALL territory ids
node mobile-app/scripts/asc-api.mjs GET "/v1/territories?limit=200"   # collect ids
# POST /v2/appAvailabilities with app relationship + territoryAvailabilities for every territory

# review screenshot for the subscription (the paywall capture works)
asc subscriptions review screenshots create --subscription-id {subscription_id} \
  --file "{screenshots_dir}/<paywall>.png"
```

Target state: subscription shows `READY_TO_SUBMIT`. If a screenshot asset gets stuck in processing, delete it and re-upload.
</phase>

<phase n="E" title="Compliance">
```bash
# content rights (no third-party content is the common case)
asc apps update --id {asc_app_id} --content-rights DOES_NOT_USE_THIRD_PARTY_CONTENT

# age rating: fetch, then PATCH honest answers (everything NONE/false except what the app has)
node mobile-app/scripts/asc-api.mjs GET "/v1/appInfos/{app_info_id}/ageRatingDeclaration"
node mobile-app/scripts/asc-api.mjs PATCH /v1/ageRatingDeclarations/<id> /tmp/age-req.json
```

- **Export compliance**: add `"ITSAppUsesNonExemptEncryption": false` to `infoPlist` in `mobile-app/app.config.ts` (standard HTTPS-only apps) so every build auto-answers it.
- **App Privacy questionnaire is WEB-ONLY** — the API cannot complete it. Give the user the direct link `https://appstoreconnect.apple.com/apps/{asc_app_id}/distribution/privacy` plus the exact declarations to click, derived from what the app actually collects (this boilerplate baseline: email + user content, linked to identity, no tracking). This is the one manual gate before submission.
</phase>

<phase n="F" title="Review details, validate, submit">
```bash
# review details — the demo account is built into the boilerplate auth
node mobile-app/scripts/asc-api.mjs POST /v1/appStoreReviewDetails /tmp/review-req.json
```

`review-req.json`: contact name/email/phone from the user, `demoAccountName: "appstoretest@email.com"`, `demoAccountPassword: "123456"`, `demoAccountRequired: true`, and notes explaining the OTP flow: *"Sign in with the email OTP flow: enter appstoretest@email.com, the one-time code is fixed to 123456 for this account."* Describe the core flow in 2-3 sentences.

```bash
asc validate --app {asc_app_id} --version "<version>" --platform IOS --output json
```

Fix every `severity: error` (the phases above cover all standard ones). When clean AND the user confirms App Privacy is published:

```bash
asc review submit --app {asc_app_id} --version "<version>" --dry-run --output table
asc review submit --app {asc_app_id} --version "<version>" --confirm     # only after explicit user confirmation
```

Report: version, build number, what was submitted, expected review timeline, and how to monitor (`asc status --app {asc_app_id}`).
</phase>

<failure_modes>
- **`asc validate` error: missing screenshots** → wrong display type. iPhone 6.7" = `IPHONE_65`; sizes must be exactly 1284x2778 (or 1290x2796 for iPhone 15 Pro Max class).
- **`pricing availability edit: app availability not found`** → availability was never initialized; use `POST /v2/appAvailabilities` (v2!) with all territories, then retry.
- **Subscription review screenshot stuck in AWAITING_UPLOAD/processing** → delete the asset and re-upload the PNG.
- **Paywall screenshot shows "Continue (Dev)"** → `EXPO_PUBLIC_ALLOW_DEV_PAYMENT_BYPASS` was true during capture; set it false, relaunch, recapture.
- **Maestro types stray characters into inputs** → erase and retype (`eraseText: 50` then `inputText`), keep one input per flow step.
- **Wrong app loads in simulator** → another Metro on port 8081; kill it or pin ports (see `docs/troubleshooting.md`).
- **Review rejection: terms not visible** → subscription apps must link Terms of Use in the description or EULA field; Phase C appends it.
- **Submission blocked on App Privacy** → web-only questionnaire not published yet; it must show "published" before submit.
</failure_modes>

<success_metrics>
- All screenshots 1284x2778, demo data only, uploaded to the right localization + display type.
- Metadata, category, copyright, age rating, content rights all set via API (idempotent — re-running is safe).
- Subscription (if any) `READY_TO_SUBMIT` with localized name, price, availability, and review screenshot.
- `asc validate` returns zero errors.
- Review submitted only after explicit user confirmation, with the demo account in review notes.
</success_metrics>
