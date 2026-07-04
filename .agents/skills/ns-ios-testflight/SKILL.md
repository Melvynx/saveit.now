---
name: ns-ios-testflight
description: Build a NowStack Mobile iOS app and upload it to TestFlight. Always check OS first: macOS uses local `eas build --local`; Windows/Linux must run ns-setup-expo and use EAS cloud.
---

# iOS TestFlight - NowStack Mobile

Take a working NowStack Mobile app from local dev to an installable TestFlight build. Run phases A-D for setup only (stop before the build, report readiness); run all phases end to end to build and upload. This is the iOS beta surface; for App Store review use `ns-ios-distribute`.

Default build mode on **macOS** is a local Mac build with `eas build --local`, so it does not consume Expo/EAS cloud build credits. On **Windows or Linux**, do not attempt a local iOS build; load/follow `ns-setup-expo`, verify the Expo/EAS account and project link, then use the EAS cloud build path.

<objective>
Go from "the app works in the simulator" to "a build is installable from TestFlight" with maximum automation. Choose the build path from the OS: default to the local Mac build path on macOS to preserve Expo cloud credits; use EAS cloud on Windows/Linux after `ns-setup-expo` verifies the Expo account and project link. Everything used here ships in this repo or is a public CLI (`eas-cli`, `asc`, `openssl`, `node`).

The proven flow (battle-tested on a real app built from this boilerplate):

1. Create the EAS project and wire `easProjectId` into `site-config.ts`.
2. Deploy Convex to production and set prod env vars.
3. Point `eas.json` production env at the prod Convex URLs.
4. Create Apple signing credentials (distribution cert + App Store provisioning profile) through the **App Store Connect API** using `mobile-app/scripts/asc-api.mjs` — no browser, no Apple ID 2FA.
5. Run a local signed App Store IPA build with `eas build --local`, `credentialsSource: "local"`, and an explicit `--output /tmp/{slug}.ipa`.
6. Upload the `.ipa` to TestFlight with `asc publish testflight` into an internal beta group.
7. Complete TestFlight metadata, rerun `asc validate testflight` until the build is valid for beta distribution, then verify every expected tester is invited and has access to the uploaded build.

The key insight: interactive `eas build` credential setup requires Apple ID 2FA and cannot be automated reliably. The ASC API key path avoids 2FA entirely. On macOS, local `eas build --local` avoids Expo cloud build credits while still using the same local signing files; on Windows/Linux, EAS cloud is the only supported iOS build path.
</objective>

<arguments>
- Default / no flag: detect OS, run setup, choose the matching build path, upload, and verify.
- macOS/Darwin: use the local build phase unless the user explicitly asks for EAS cloud.
- Windows/Linux: run `ns-setup-expo` checks first, then use the EAS cloud build phase. This consumes Expo/EAS build quota and requires explicit user confirmation.
- `--expo`: force EAS cloud build even on macOS. This consumes Expo/EAS build quota and requires explicit user confirmation.
- Setup-only requests (`ios setup`, "prepare TestFlight", "credentials only"): run phases A-D, then stop before any build/upload.
</arguments>

<prerequisites>
The user must have (ask once, as a group — these cannot be created by the agent):

1. **Apple Developer Program membership** (paid, enrolled).
2. **App Store Connect API key**: the `AuthKey_<KEY_ID>.p8` file, its key ID, and the team issuer ID. If unknown, run the `ns-find-asc-credentials` skill, or point the user to App Store Connect > Users and Access > Integrations > App Store Connect API (key must have Admin or App Manager role).
3. **Expo account** logged in and linked: `npx eas-cli@latest whoami`, a real `easProjectId` in `site-config.ts`, and `expo-doctor` clean. If missing, load/follow `ns-setup-expo` before building.
4. **App record in App Store Connect** for the bundle ID. The public API cannot create app records — if missing, the user creates it once at appstoreconnect.apple.com (My Apps > + > New App, selecting the bundle ID). Verify with Phase D step 1 and stop with clear instructions if absent.
5. `asc` CLI installed (`brew install asc`) — used only for the final upload; everything else goes through `scripts/asc-api.mjs`.
6. For macOS local builds: Xcode command line tools and CocoaPods (`xcodebuild -version`, `command -v pod`). On Windows/Linux, skip these checks and use EAS cloud after `ns-setup-expo`.
</prerequisites>

<state_variables>
| Variable | Source |
| --- | --- |
| `{bundle_id}` | `SiteConfig.bundleId` |
| `{apple_team_id}` | `SiteConfig.appleTeamId` |
| `{eas_project_id}` | output of `eas project:init`, then written to `site-config.ts` |
| `{asc_key_id}` / `{asc_issuer_id}` / `{asc_p8_path}` | from the user / `ns-find-asc-credentials`. Never commit, never print. |
| `{convex_prod_url}` / `{convex_prod_site_url}` | from `npx convex deploy` output / Convex dashboard |
| `{asc_app_id}` | numeric app ID resolved from the bundle ID (Phase D) |
| `{build_mode}` | `local` only on macOS unless `--expo` is forced; `expo` on Windows/Linux |
| `{ipa_path}` | `/tmp/{slug}.ipa` from local build, or downloaded cloud artifact |
| `{build_id}` | `buildId` from `asc publish testflight --output json` |
| `{beta_group_id}` | Internal beta group ID |
| `{what_to_test}` | Build-specific TestFlight notes, derived from the current change or asked once if unknown |
| `{review_contact_*}` | TestFlight beta review contact fields from project/release config, App Store Connect, or the user |
| `{expected_tester_emails}` | User-requested tester emails plus existing internal group testers when the goal is "invite all" |
</state_variables>

<platform_build_routing>
Run this before Phase A build checks:

```bash
uname -s || node -p "process.platform"
```

- `Darwin` / `darwin`: local iOS production builds are allowed. Continue with local toolchain checks and use Phase E unless the user explicitly passed `--expo`.
- `Linux`, `win32`, or Windows PowerShell: local iOS production builds are not allowed. Load/follow `.agents/skills/ns-setup-expo/SKILL.md`; verify `eas-cli`, `eas whoami`, real `easProjectId`, and `cd mobile-app && npx expo-doctor`. Then set `{build_mode}=expo` and use Phase E-expo.
- If EAS setup is incomplete on Windows/Linux, stop after running/fixing `ns-setup-expo`; do not continue to signing/build/upload until Expo account linking is green.
</platform_build_routing>

<critical_safety>
- Never commit or print `.p8` keys, `.p12` files, p12 passwords, provisioning profiles, or `credentials.json`. The repo `.gitignore` already excludes them — verify before any commit.
- Export ASC credentials as env vars for `scripts/asc-api.mjs`; do not write them into files inside the repo.
- Get explicit user confirmation before: creating Apple certificates (accounts have a low cert limit), using `--expo` cloud EAS builds (consumes build credits), and the TestFlight upload.
- Local builds do not consume Expo cloud credits, but they still sign a production App Store IPA and may increment the remote EAS build number when `appVersionSource` is `remote`.
- Builds bake env vars in permanently: confirm `eas.json` points at the PROD Convex deployment before building, or testers ship with a dev backend.
</critical_safety>

<phase n="A" title="Preflight">
From the repo root:

```bash
npm run check-setup          # must be free of errors (easProjectId warning is expected pre-init)
cd mobile-app && npx tsc --noEmit && npm run lint
uname -s || node -p "process.platform"
npx eas-cli@latest whoami    # Expo account logged in?
command -v asc && asc version
xcodebuild -version && command -v pod   # required only when OS is macOS/Darwin and build_mode=local
```

Read `site-config.ts` and confirm with the user: `title`, `bundleId`, `appleTeamId`, payment product IDs. The bundle ID is permanent once the app record exists — it must be final now.

Export the ASC credentials for the rest of the session:

```bash
export ASC_KEY_ID="<10-char key id>"
export ASC_ISSUER_ID="<issuer uuid>"
export ASC_P8_PATH="/path/to/AuthKey_<KEY_ID>.p8"
```
</phase>

<phase n="B" title="EAS project init">
Skip if `easProjectId` in `site-config.ts` is already a real UUID.

```bash
cd mobile-app
npx eas-cli@latest project:init --non-interactive --force
npx eas-cli@latest project:info
```

Write the printed project ID into `site-config.ts > easProjectId`. Re-run `npm run check-setup` — the easProjectId warning must be gone.
</phase>

<phase n="C" title="Convex production + eas.json">
Follow `docs/production-checklist.md` stage 1. Summary:

```bash
npx convex deploy -y
# prod env starts EMPTY — set every required var:
npx convex env set --prod SITE_URL "https://<the-app-domain>"
npx convex env set --prod BETTER_AUTH_SECRET "$(openssl rand -hex 32)"   # fresh, never reuse dev
npx convex env set --prod RESEND_API_KEY "$(npx convex env get RESEND_API_KEY)"
npx convex env set --prod EMAIL_FROM "$(npx convex env get EMAIL_FROM)"
# if Apple Sign In is enabled: APPLE_CLIENT_ID = {bundle_id}, APPLE_CLIENT_SECRET copied from dev
# if Google Sign In is enabled: GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET copied from dev
npx convex env list --prod
```

Then put the prod URLs into `mobile-app/eas.json > build.production`:

```json
"production": {
  "autoIncrement": true,
  "credentialsSource": "local",
  "env": {
    "EXPO_PUBLIC_CONVEX_URL": "https://<prod-deployment>.convex.cloud",
    "EXPO_PUBLIC_CONVEX_SITE_URL": "https://<prod-deployment>.convex.site"
  }
}
```

`credentialsSource: "local"` is what makes the build fully non-interactive (Phase E).
</phase>

<phase n="D" title="Apple signing credentials via ASC API">
All API calls use `node mobile-app/scripts/asc-api.mjs <METHOD> <path> [body.json]` with the env vars from Phase A. Work in a directory OUTSIDE the repo (e.g. `~/ios-credentials/<slug>/`) so nothing secret can be committed.

**1. Resolve the app record (hard gate):**

```bash
node mobile-app/scripts/asc-api.mjs GET "/v1/apps?filter[bundleId]={bundle_id}"
```

Empty `data` → STOP. Tell the user to create the app record at appstoreconnect.apple.com (My Apps > + > New App) with this exact bundle ID, then resume. Otherwise save `{asc_app_id}` = `data[0].id`.

**2. Bundle ID registration + capabilities:**

```bash
node mobile-app/scripts/asc-api.mjs GET "/v1/bundleIds?filter[identifier]={bundle_id}"
# if missing, register it:
# POST /v1/bundleIds  {"data":{"type":"bundleIds","attributes":{"identifier":"{bundle_id}","name":"{title}","platform":"IOS"}}}
node mobile-app/scripts/asc-api.mjs GET "/v1/bundleIds/<BUNDLE_DB_ID>/bundleIdCapabilities"
# enable missing capabilities the app uses (IN_APP_PURCHASE, APPLE_ID_AUTH, PUSH_NOTIFICATIONS):
# POST /v1/bundleIdCapabilities {"data":{"type":"bundleIdCapabilities","attributes":{"capabilityType":"APPLE_ID_AUTH"},"relationships":{"bundleId":{"data":{"type":"bundleIds","id":"<BUNDLE_DB_ID>"}}}}}
```

**3. Distribution certificate.** First check for an existing one (Apple caps distribution certs at ~2-3 per account):

```bash
node mobile-app/scripts/asc-api.mjs GET "/v1/certificates?filter[certificateType]=DISTRIBUTION"
```

Reuse only if the user has its private key/.p12 locally. Otherwise create a new one (with user confirmation):

```bash
openssl req -new -newkey rsa:2048 -nodes -keyout dist.key -out dist.csr \
  -subj "/emailAddress=<user-email>/CN={title} Distribution/C=US"
node -e "const fs=require('fs');fs.writeFileSync('cert-req.json',JSON.stringify({data:{type:'certificates',attributes:{certificateType:'DISTRIBUTION',csrContent:fs.readFileSync('dist.csr','utf8')}}}))"
node mobile-app/scripts/asc-api.mjs POST /v1/certificates cert-req.json
# save body.data.id (cert id) and body.data.attributes.certificateContent (base64) -> dist.cer
```

**4. App Store provisioning profile:**

```bash
node -e "const fs=require('fs');fs.writeFileSync('profile-req.json',JSON.stringify({data:{type:'profiles',attributes:{name:'{title} AppStore',profileType:'IOS_APP_STORE'},relationships:{bundleId:{data:{type:'bundleIds',id:'<BUNDLE_DB_ID>'}},certificates:{data:[{type:'certificates',id:'<CERT_ID>'}]},devices:{data:[]}}}}))"
node mobile-app/scripts/asc-api.mjs POST /v1/profiles profile-req.json
# save body.data.attributes.profileContent (base64) -> profile.mobileprovision
```

**5. Build the .p12 (the `-legacy` flag is mandatory — Apple tooling rejects OpenSSL 3.x default ciphers):**

```bash
echo "<certificateContent-b64>" | base64 -d > dist.cer
P12PASS=$(openssl rand -hex 12)
openssl x509 -inform der -in dist.cer -out dist.pem 2>/dev/null || cp dist.cer dist.pem
openssl pkcs12 -export -in dist.pem -inkey dist.key -out dist.p12 \
  -name "{title} Distribution" -passout pass:"$P12PASS" -legacy
echo "<profileContent-b64>" | base64 -d > appstore.mobileprovision
```

**6. Wire into the project (gitignored paths only):**

```bash
mkdir -p mobile-app/credentials
cp dist.p12 mobile-app/credentials/dist.p12
cp appstore.mobileprovision mobile-app/credentials/
node -e "const fs=require('fs');fs.writeFileSync('mobile-app/credentials.json',JSON.stringify({ios:{provisioningProfilePath:'credentials/appstore.mobileprovision',distributionCertificate:{path:'credentials/dist.p12',password:process.argv[1]}}},null,2))" "$P12PASS"
git check-ignore mobile-app/credentials.json mobile-app/credentials/dist.p12   # MUST print both paths
```

Setup-only mode STOPS here — report readiness (app record, cert, profile, credentials.json, eas.json) and the next command.
</phase>

<phase n="E" title="Local iOS build (macOS default)">
Default path on macOS only. This uses the local Mac/Xcode toolchain and does **not** consume Expo cloud build credits. It still uses EAS CLI for config/versioning and local credentials for signing.

```bash
cd mobile-app
npx eas-cli@latest build --platform ios --profile production \
  --local --non-interactive --output /tmp/{slug}.ipa
```

If the build fails in `expo doctor` due to patch-version mismatches, inspect the exact error. Do not blindly upgrade dependencies during a release unless the build is blocked; if blocked, run `npx expo install --check`, apply the minimal Expo SDK patch updates, rerun `npx tsc --noEmit && npm run lint`, then rebuild.

Local `autoIncrement` can skip build numbers if a canceled cloud build already reserved one. That is acceptable for App Store Connect.
</phase>

<phase n="E-expo" title="EAS cloud build (Windows/Linux or --expo)">
Run this phase when the OS is Windows/Linux, or when the user passes `--expo` on macOS. First load/follow `ns-setup-expo` and confirm once because it consumes Expo/EAS build credits:

```bash
cd mobile-app
npx eas-cli@latest build --platform ios --profile production --non-interactive --no-wait
```

Poll until terminal state (FINISHED / ERRORED):

```bash
npx eas-cli@latest build:list --platform ios --limit 1 --json --non-interactive
# or: npx eas-cli@latest build:view <BUILD_ID> --json
```

On FINISHED, download the artifact:

```bash
curl -sL -o /tmp/{slug}.ipa "<artifacts.buildUrl>"
```
</phase>

<phase n="F" title="TestFlight upload">
**1. Internal beta group** (TestFlight needs a group; `asc publish testflight` fails without `--group`):

```bash
node -e "const fs=require('fs');fs.writeFileSync('group-req.json',JSON.stringify({data:{type:'betaGroups',attributes:{name:'Internal',isInternalGroup:true,hasAccessToAllBuilds:true},relationships:{app:{data:{type:'apps',id:'{asc_app_id}'}}}}}))"
node mobile-app/scripts/asc-api.mjs POST /v1/betaGroups group-req.json
# 409 "already exists" is fine — fetch the id: GET "/v1/apps/{asc_app_id}/betaGroups"
```

**2. Upload and wait for processing** (asc must be authenticated — `asc auth status --validate`, else `asc auth login` with the same ASC key):

```bash
asc publish testflight --app "{asc_app_id}" --ipa /tmp/{slug}.ipa \
  --group "<BETA_GROUP_ID>" --wait --timeout 45m --output json --pretty \
  | tee "/tmp/{slug}-testflight-upload.json"
node -e "const r=require('/tmp/{slug}-testflight-upload.json'); console.log(r.buildId)"
```

Save the printed value as `{build_id}`. Do not continue if `processingState` is not `VALID`; keep waiting/polling with `asc status --app "{asc_app_id}" --output table` until the build is valid, or report the exact Apple processing failure.

**3. Complete TestFlight metadata and validate readiness**. A successful binary upload is not enough. The skill must make `asc validate testflight` pass before reporting success.

First inspect the current gaps:

```bash
asc validate testflight --app "{asc_app_id}" --build "{build_id}" --output table
```

If beta review contact fields are missing, fetch the review detail ID and edit the missing fields. Use existing project/release contact values when available; otherwise ask the user once for the missing contact fields and resume the workflow.

```bash
asc testflight review view --app "{asc_app_id}" --output json --pretty \
  | tee "/tmp/{slug}-testflight-review.json"
# Extract the betaAppReviewDetail id from the JSON output, then:
asc testflight review edit --id "{review_detail_id}" \
  --contact-first-name "{review_contact_first_name}" \
  --contact-last-name "{review_contact_last_name}" \
  --contact-email "{review_contact_email}" \
  --contact-phone "{review_contact_phone}" \
  --demo-account-required false \
  --notes "{review_notes}"
```

If "What to Test" is missing, create or update the build localization for `en-US`. The notes must be specific to the uploaded build; do not use an empty placeholder.

```bash
asc build-localizations list --build "{build_id}" --locale en-US --output json --pretty \
  | tee "/tmp/{slug}-build-localizations.json"
# If no en-US localization exists:
asc build-localizations create --build "{build_id}" --locale en-US \
  --whats-new "{what_to_test}"
# If one exists:
asc build-localizations update --id "{build_localization_id}" \
  --whats-new "{what_to_test}"
```

Rerun validation after every metadata change and do not move to tester verification until it is clean:

```bash
asc validate testflight --app "{asc_app_id}" --build "{build_id}" --output table
```

**4. Add testers and attach the uploaded build**. Internal testers must be App Store Connect team members; external emails work via groups. For "invite all", treat all existing internal group testers plus user-provided emails as `{expected_tester_emails}`. Do not assume group access refreshed invite links.

```bash
node -e "const fs=require('fs');fs.writeFileSync('tester-req.json',JSON.stringify({data:{type:'betaTesters',attributes:{email:'<tester-email>'},relationships:{betaGroups:{data:[{type:'betaGroups',id:'<BETA_GROUP_ID>'}]}}}}))"
node mobile-app/scripts/asc-api.mjs POST /v1/betaTesters tester-req.json
```

For each expected tester, verify/create the tester row, add them to the internal group, attach the uploaded build, and resend a fresh invite:

```bash
asc testflight testers list --app "{asc_app_id}" --output json --pretty
asc testflight testers invite --app "{asc_app_id}" --email "<tester-email>" --group "{beta_group_id}"
asc testflight testers add-groups --id "{tester_id}" --group "{beta_group_id}"
asc testflight testers add-builds --id "{tester_id}" --build-id "{build_id}"
asc testflight testers invite --app "{asc_app_id}" --email "<tester-email>" --group "{beta_group_id}"
```

**5. Verify installability and invitations**. Finish only after all checks below are true:

```bash
asc status --app "{asc_app_id}" --output table
asc validate testflight --app "{asc_app_id}" --build "{build_id}" --output table
asc testflight groups links view --group-id "{beta_group_id}" --type betaTesters --paginate --output json --pretty
asc testflight groups links view --group-id "{beta_group_id}" --type builds --paginate --output json --pretty
asc testflight testers builds list --tester-id "{tester_id}" --output table
asc testflight testers groups list --tester-id "{tester_id}" --output table
```

Report the build number, build ID, validation result, beta group, and verified tester emails. If any tester cannot be invited because of App Store Connect account visibility or team membership, fix the visibility when possible; otherwise report that tester as the only remaining blocker with the exact ASC error.
</phase>

<failure_modes>
- **`.p12` rejected during signing** → it was exported without `-legacy`. Re-export: `openssl pkcs12 -in dist.p12 -nodes -out tmp.pem -passin pass:"$P12PASS" && openssl pkcs12 -export -in tmp.pem -out dist.p12 -passout pass:"$P12PASS" -legacy`.
- **Certificate creation returns 409 / limit reached** → list existing DISTRIBUTION certs; ask the user which to revoke (`DELETE /v1/certificates/<id>`) or whether they have its .p12 to reuse. Never revoke without confirmation — it breaks other apps signed with it.
- **Local build requested on Windows/Linux** → do not try to install Xcode or run `--local`. Load/follow `ns-setup-expo`, verify `eas whoami` + linked `easProjectId`, then use Phase E-expo.
- **Local build fails before Xcode archive on macOS** → verify macOS/Xcode/CocoaPods: `xcodebuild -version`, `xcode-select -p`, `command -v pod`. If unavailable and the user accepts cloud quota usage, rerun with EAS cloud.
- **Local build fails asking for credentials** → `credentialsSource: "local"` is missing in `eas.json`, or `credentials.json` paths are wrong (they are relative to `mobile-app/`).
- **`--expo` cloud build fails asking for credentials** → same credential checks as local, then rerun cloud build.
- **`asc publish testflight` fails with "--group is required"** → create the beta group first (Phase F step 1).
- **`asc validate testflight` fails after upload** → fix the reported metadata immediately. Missing review contact fields are fixed with `asc testflight review edit`; missing "What to Test" is fixed with `asc build-localizations create/update`. Do not report TestFlight success until validation passes.
- **Tester sees "invitation revoked" or cannot install** → verify the tester is in the beta group and attached to the exact `{build_id}`, then resend the invite after build attachment with `asc testflight testers invite --app "{asc_app_id}" --email "<email>" --group "{beta_group_id}"`.
- **Upload rejected: missing export compliance** → answer the encryption question in App Store Connect once, or add `"ITSAppUsesNonExemptEncryption": false` to `infoPlist` in `mobile-app/app.config.ts` so future builds skip it.
- **App opens but can't reach backend** → build was made before `eas.json` had prod URLs, or prod Convex env vars are missing (`npx convex env list --prod`). Rebuild after fixing — env is baked at build time.
- **User insists on EAS-managed credentials (Apple ID login)** → that flow requires interactive 2FA and cannot run with `--non-interactive`. Run `npx eas-cli@latest credentials` in a real terminal with the user present, then build. Do not attempt to script the 2FA prompt.
</failure_modes>

<success_metrics>
- `npm run check-setup` passes with a real `easProjectId`.
- macOS local build produces `/tmp/{slug}.ipa` without any interactive prompt; Windows/Linux EAS cloud builds reach FINISHED after `ns-setup-expo` verifies Expo account linking.
- `asc validate testflight --app "{asc_app_id}" --build "{build_id}" --output table` passes after metadata fixes.
- The build shows as processed in TestFlight, attached to a beta group with at least one tester.
- Every expected tester is in the beta group, has the exact uploaded build attached, and has received a fresh invite after build attachment.
- The TestFlight app signs in and talks to the PROD Convex deployment.
- `git status` shows no credential files staged; nothing secret printed in the transcript.
</success_metrics>
