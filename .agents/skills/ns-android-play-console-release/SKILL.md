---
name: ns-android-play-console-release
description: Finish NowStack Mobile Google Play setup and internal Android releases. Use for signed AAB upload, gpc/browser fallback, privacy/app-content gates, or gpc commit failures.
---

# Android Play Console Release

Use this skill for the practical NowStack Android Play Console path after the Play app/package exists: build a production AAB, validate it, upload it to the Play internal track, and finish the Play Console compliance gates that cannot be safely automated from the API.

## Decision

- Use CLI/API for binary work: building, validating, uploading to internal, checking release status, and reading the internal track.
- Use browser UI for Play Console questionnaires: App access/login instructions, Data safety, content rating, target audience, ads, advertising ID, government/financial/health declarations, privacy policy, and final send-for-review decisions.
- Use browser UI when `gpc` listings/apps mutations fail with rejected-update acknowledgement bugs even when `--changes-not-sent-for-review` is passed.
- Stop before production or final review submission unless the user explicitly confirms that step.

## Preconditions

Read the repo rules before mutations:

```text
.agents/rules/store-release.md
.agents/rules/mobile-app.md
.agents/rules/auth-payments-storage.md
```

Confirm:

- `site-config.ts > androidPackage` matches the Play app package.
- `mobile-app/app.config.ts` resolves the same Android package.
- `mobile-app/google-play-service-account.json` exists, is ignored, and works with the target Play app.
- The user has explicitly asked for the build/upload/setup mutation.

Never print service-account private keys or commit credential files.

## Build

Detect the OS before choosing the build path:

```bash
uname -s || node -p "process.platform"
```

- **macOS / Darwin**: prefer the repo's configured local EAS build when the user wants to avoid cloud credits but still use EAS-managed Android signing.
- **Windows/Linux**: do not attempt local Android production builds. Load/follow `.agents/skills/ns-setup-expo/SKILL.md`, verify `eas-cli`, `eas whoami`, linked `easProjectId`, and `expo-doctor`, then use EAS cloud for the signed AAB.

macOS local EAS build:

```bash
cd mobile-app
eas build --platform android --profile production --local --non-interactive --output /tmp/nowstack-android-local-v<N>.aab
```

Windows/Linux EAS cloud build:

```bash
cd mobile-app
npx eas-cli@latest build --platform android --profile production --non-interactive
```

Verify generated Expo config before building:

```bash
cd mobile-app
npx expo config --type public
```

Expected success signals:

- EAS increments `versionCode`.
- Remote Android credentials are used.
- Gradle finishes `:app:bundleRelease`.
- The AAB is written to the explicit `/tmp/...aab` output path.

## Validate

Run local and server-side validation before mutation:

```bash
ls -lh /tmp/nowstack-android-local-v<N>.aab
shasum -a 256 /tmp/nowstack-android-local-v<N>.aab
gpc validate /tmp/nowstack-android-local-v<N>.aab --output json
gpc --app dev.melvynx.nowstack publish /tmp/nowstack-android-local-v<N>.aab --track internal --notes "Initial internal test release." --validate-only --changes-not-sent-for-review
```

`gpc preflight` is useful when it works, but do not treat a local CLI crash as a Play rejection. Record the crash and continue with stronger signals.

## Upload

Try `gpc` first:

```bash
gpc --app dev.melvynx.nowstack --no-interactive --yes releases upload /tmp/nowstack-android-local-v<N>.aab \
  --track internal \
  --notes "Initial internal test release." \
  --name "1.0.0 (<versionCode>)" \
  --changes-not-sent-for-review \
  --output json
```

If `gpc publish` or `gpc releases upload` validates but fails during real commit, use the bundled direct API fallback:

```bash
node .agents/skills/ns-android-play-console-release/scripts/upload-internal-release.cjs \
  --app dev.melvynx.nowstack \
  --aab /tmp/nowstack-android-local-v<N>.aab \
  --service-account mobile-app/google-play-service-account.json \
  --track internal \
  --name "1.0.0 (<versionCode>)" \
  --notes "Initial internal test release."
```

The script creates an Android Publisher edit, uploads the AAB, assigns the track, and commits with retry. It auto-recovers from both states observed in practice:

- `changesNotSentForReview` required.
- `changesNotSentForReview` must not be set.
- Bundle upload not completed yet at commit time.

Verify after upload:

```bash
gpc --app dev.melvynx.nowstack releases status --output json
```

Success looks like:

```json
[
  {
    "track": "internal",
    "status": "completed",
    "versionCodes": ["6"]
  }
]
```

## Play Console UI Gates

Binary upload can be done via CLI/API. Play Console setup is only partly automatable.

Use browser UI for:

- Privacy policy URL.
- Ads declaration.
- App access/login instructions.
- Data safety.
- Content rating.
- Target audience and content.
- Advertising ID.
- Government apps.
- Financial features.
- Health apps.
- Store listing contact details when `gpc apps/listings update` hits rejected-update acknowledgement bugs.

Known reviewer account pattern for this repo:

```text
Email: appstoretest@email.com
OTP/code: 123456
Instructions:
Open the app, choose Continue with email, enter appstoretest@email.com, then use verification code 123456. If the onboarding paywall appears, continue with the available non-purchase path. No Google or Apple sign-in is required.
```

Do not claim premium/full paid access unless the account is actually granted it in production.

If Chrome automation is blocked by an extension popup such as 1Password, stop and ask the user to dismiss the popup. Do not switch to risky OS-level browser control for Play Console forms.

## Failure Modes

- `API_CHANGES_NOT_SENT_FOR_REVIEW` even with the flag: use the direct API fallback script or browser UI.
- `changesNotSentForReview must not be set`: commit the same edit without that query parameter; the fallback script handles this.
- `Some of the Android App Bundle uploads are not completed yet`: retry commit on the same edit after waiting; the fallback script handles this.
- `This Edit has been deleted`: the failed CLI edit is gone; create a new edit and re-upload.
- Empty `gpc status` releases but `gpc releases status` shows internal: trust the track-specific release status for binary proof.
- Chrome says automation is blocked by another extension UI: user must dismiss the extension popup before browser work can continue.

## Report

Include:

- Package name.
- AAB path and SHA256.
- VersionCode.
- Track and status from `gpc releases status`.
- Which Play Console UI declarations were completed.
- Which UI declarations remain blocked/manual.
