---
name: ns-find-gpc-credentials
description: Find and set up Google Play Console service-account JSON credentials for gpc. Use when Android Play uploads need auth, GPC_SERVICE_ACCOUNT is unknown, or before ns-deploy-android-app/ns-android-beta.
---

# Find Google Play Console Credentials

<objective>
`gpc auth login` needs a **Google service-account JSON key**, a **Play Console app/package**, and **Play Console permissions** for that service-account email. This skill finds or creates the JSON, stores it in the repo-ignored NowStack path, and verifies that `gpc` can access `dev.melvynx.nowstack`.

Key insight from the NowStack Android setup: this is a two-console credential. Google Cloud owns the service account and JSON key; Google Play Console owns app access. A Cloud project alone is not enough. The service-account email must be invited in Play Console -> Users and permissions with app-scoped release permissions.

Terminology: `gpc` here means the Google Play Console CLI used by this repo. `gcp` means Google Cloud Platform, where the service account is created.
</objective>

<nowstack_state>
Known NowStack values:

| Value | Current value |
| --- | --- |
| Android package | `dev.melvynx.nowstack` |
| Runtime credential path | `mobile-app/google-play-service-account.json` |
| Git ignore status | `mobile-app/google-play-service-account.json` is ignored |
| Android deploy skill | `.agents/skills/ns-deploy-android-app/SKILL.md` |
| Observed download candidate | `~/Downloads/play-publisher-500306-d28739223973.json` |

Treat observed downloads as candidates only. Verify JSON structure before using them.
</nowstack_state>

<credentials_anatomy>
| Credential | What it looks like | Where it lives |
| --- | --- | --- |
| Service-account JSON | JSON with `type: "service_account"`, `project_id`, `private_key_id`, `private_key`, `client_email` | User disk; Downloads first, then repo ignored runtime path |
| Client email | `<name>@<project-id>.iam.gserviceaccount.com` | Inside the JSON; this is what Play Console must invite |
| Cloud project ID | e.g. `play-publisher-500306` | Inside the JSON; API must be enabled here |
| Android package | `dev.melvynx.nowstack` | `site-config.ts > androidPackage`, Expo `android.package`, Play Console app |
| Developer ID | long numeric ID in Play Console URLs | Optional; useful for debugging account selection |

Look-alikes that are NOT Play publishing credentials:

- `google-services.json` - Firebase client config, not an API private key.
- Android keystore files (`.jks`, `.keystore`) - signing credentials, not Play API auth.
- App Store Connect `.p8` files - iOS only.
- OAuth client secrets - not the default credential for `gpc`/Fastlane server-side uploads.
</credentials_anatomy>

<step n="1" title="Check if gpc already works">

From the repo root:

```bash
command -v gpc && gpc --version
export GPC_APP="dev.melvynx.nowstack"
test -f mobile-app/google-play-service-account.json && export GPC_SERVICE_ACCOUNT="$PWD/mobile-app/google-play-service-account.json"
gpc doctor || true
gpc status || true
```

If `gpc doctor` and a read-only `gpc status` work for `dev.melvynx.nowstack`, stop. The credential is already usable.
</step>

<step n="2" title="Hunt for service-account JSON files">

Search standard locations first. Use `jq` to avoid mistaking random JSON files for credentials:

```bash
find "$HOME/Downloads" "$HOME/Desktop" "$HOME/Documents" "$HOME/Developer" "$HOME/.config/gcloud" \
  -maxdepth 6 -type f -name "*.json" -size -2M 2>/dev/null |
while IFS= read -r file; do
  jq -e '
    .type == "service_account"
    and (.client_email | test("@.*\\.iam\\.gserviceaccount\\.com$"))
    and (.private_key | startswith("-----BEGIN PRIVATE KEY-----"))
  ' "$file" >/dev/null 2>&1 || continue

  jq -r --arg file "$file" '
    "\($file)\tproject=\(.project_id)\temail=\(.client_email)\tkey_id=\((.private_key_id // "")[0:8])..."
  ' "$file"
done
```

Do not print `.private_key`. Do not paste the JSON into chat. File path, project ID, and client email are enough for debugging.
</step>

<step n="3" title="If no JSON exists, create/download one">

Use the official shape: create/select a Google Cloud project, enable the Google Play Android Developer API, create a service account, create a JSON key, then grant the service-account email access in Play Console.

If the user sees a Google Cloud project selector with "Nouveau projet" and no obvious "linked project", that is normal enough. Create or select a dedicated Cloud project for Play publishing. Do not burn time looking for a hidden linked-project list. The real access gate is:

1. `androidpublisher.googleapis.com` enabled on the Cloud project.
2. Service account JSON key downloaded.
3. Service-account email invited in Play Console -> Users and permissions.

Manual console path:

```text
Google Cloud Console -> IAM & Admin -> Service Accounts
Google Cloud Console -> APIs & Services -> Library -> Google Play Android Developer API -> Enable
Play Console -> Users and permissions -> Invite new user
```

CLI path when `gcloud` is already authenticated and the user has chosen `{project_id}`:

```bash
gcloud config set project "{project_id}"
gcloud services enable androidpublisher.googleapis.com
gcloud iam service-accounts create play-publisher --display-name "NowStack Play Publisher"
gcloud iam service-accounts keys create "$HOME/Downloads/nowstack-play-publisher.json" \
  --iam-account "play-publisher@{project_id}.iam.gserviceaccount.com"
```

The downloaded JSON key is a secret. It can be recreated later by creating another key, but this exact private key is only shown/downloaded at creation time.
</step>

<step n="4" title="Grant Play Console permissions">

Open Play Console as the account owner/admin and invite the service-account email from the JSON:

```bash
jq -r .client_email mobile-app/google-play-service-account.json
```

Grant app-scoped access to the NowStack app/package `dev.melvynx.nowstack`. Minimum practical permissions depend on the target flow:

- Internal/closed testing upload: grant the permissions needed to view app information, manage testing tracks, and release apps to testing tracks.
- Production rollout: also grant release-to-production permissions.
- Listing/screenshots automation: grant store presence/listing permissions.
- Billing/purchase verification: grant the financial/orders/subscriptions permissions required by the Google Play Developer API.

Prefer app-scoped permissions over full account admin. Use account-level admin only if the release automation truly needs broad access and the user explicitly accepts it.
</step>

<step n="5" title="Organize the JSON">

Keep the canonical runtime path in the repo-ignored file that existing NowStack skills expect:

```bash
mkdir -p "$HOME/Developer/google-play"

# Replace the source path with the verified candidate JSON.
install -m 600 "/path/to/verified-service-account.json" \
  "$HOME/Developer/google-play/nowstack-play-service-account.json"

ln -sf "$HOME/Developer/google-play/nowstack-play-service-account.json" \
  mobile-app/google-play-service-account.json

chmod 600 "$HOME/Developer/google-play/nowstack-play-service-account.json"
```

If the verified JSON is still in `~/Downloads`, move it out of Downloads after setup so future agents do not pick an old duplicate.
</step>

<step n="6" title="Validate locally and with gpc">

First validate the file shape without exposing secrets:

```bash
export GPC_APP="dev.melvynx.nowstack"
export GPC_SERVICE_ACCOUNT="$PWD/mobile-app/google-play-service-account.json"

jq -e '
  .type == "service_account"
  and (.client_email | test("@.*\\.iam\\.gserviceaccount\\.com$"))
  and (.private_key | startswith("-----BEGIN PRIVATE KEY-----"))
  and (.project_id | length > 0)
' "$GPC_SERVICE_ACCOUNT" >/dev/null

jq -r '"project=\(.project_id)\nemail=\(.client_email)\nkey_id=\((.private_key_id // "")[0:8])..."' "$GPC_SERVICE_ACCOUNT"
```

Then authenticate and verify read-only Play access:

```bash
gpc auth login --service-account "$GPC_SERVICE_ACCOUNT"
gpc doctor
gpc status
```

If `gpc` is unavailable or blocked, validate with Fastlane as a fallback:

```bash
bundle exec fastlane run validate_play_store_json_key json_key:"$GPC_SERVICE_ACCOUNT"
```

After this skill succeeds, Android upload/promotion belongs to `ns-deploy-android-app`, `ns-android-beta`, or `ns-android-distribute`.
</step>

<step n="7" title="Persist non-secret findings">

Record only non-secret operational facts in `AGENTS.md`, release notes, or agent memory:

- Credential runtime path: `mobile-app/google-play-service-account.json`.
- Canonical local archive path: `~/Developer/google-play/nowstack-play-service-account.json`.
- Package name: `dev.melvynx.nowstack`.
- Cloud project ID.
- Service-account client email.
- Play Console permission scope: app-scoped vs account-wide, testing vs production/listing/billing.
- Verification result: `gpc doctor` and `gpc status` worked on the expected package.

Never record the private key, full JSON contents, or any copied secret material.
</step>

<failure_modes>
- `jq` finds `google-services.json`: wrong file; Firebase client config cannot authenticate Play publishing.
- `gpc doctor` says auth is missing: `GPC_SERVICE_ACCOUNT` path is wrong, the JSON is malformed, or `gpc auth login` has not been run.
- `gpc`/Fastlane says API has not been used or is disabled: enable `androidpublisher.googleapis.com` on the JSON's `project_id`.
- `The caller does not have permission`: the service-account email was not invited to Play Console, lacks app access, or lacks release/listing/billing permissions.
- `Package not found`: the Play Console app for `dev.melvynx.nowstack` does not exist in that developer account, or the service account lacks access to that app.
- Project selector confusion: use a Cloud project plus Play Console Users and permissions; do not require a visible "linked project" row before creating the service account.
- Duplicate JSON files: verify the active one by `client_email`, `project_id`, and `gpc status`; do not keep stale Downloads copies around.
</failure_modes>

<critical_safety>
- Never commit service-account JSON, keystores, passwords, `.env` secrets, or App Store `.p8` files.
- Never paste or print `.private_key`.
- Do not run upload, publish, promote, or listing mutation commands from this skill. This skill only finds/authenticates credentials and performs read-only verification.
- Do not try to automate the user's Google login or bypass 2-Step Verification. Ask the user to complete browser-only Play Console permission grants.
- Before any later real Play mutation, run validate-only/dry-run commands and get explicit user confirmation of package, account, track, service account, release notes, and artifact.
</critical_safety>

<references>
- Official Google Play Developer API setup: https://developers.google.com/android-publisher/getting_started
- Play Console users and permissions: https://support.google.com/googleplay/android-developer/answer/9844686
- Play release permissions/testing tracks: https://support.google.com/googleplay/android-developer/answer/9859348
</references>

<success_criteria>
- A valid service-account JSON is stored behind `mobile-app/google-play-service-account.json`.
- `GPC_SERVICE_ACCOUNT` points to that file and `GPC_APP=dev.melvynx.nowstack`.
- The service-account email is invited in Play Console with the needed app permissions.
- `gpc doctor` succeeds.
- `gpc status` can read the expected NowStack Play app/package.
- No secret material is committed, printed, or copied into docs.
</success_criteria>
