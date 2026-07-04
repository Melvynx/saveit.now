---
name: ns-android-distribute
description: Release a NowStack Mobile Android app to Google Play production - listing, screenshots, Data safety, content rating, release notes, then promote the tested internal build to the production track with a staged rollout. Use for "release on Android", "publish to Play production", "promote to production", "ship the Android update". If no build is on a testing track yet, run ns-android-beta first.
---

# Android Distribute - NowStack Mobile

Take a build that's already on the internal track all the way to the **production** track: store listing, screenshots, Data safety form, content rating, release notes, validate, then promote with a staged rollout. This is the Android counterpart of `ns-ios-distribute`. If nothing is on a testing track yet, run `ns-android-beta` first. The deep gpc command reference is `.agents/skills/ns-deploy-android-app/SKILL.md`.

<objective>
Orchestrate the full Google Play production release after a build is verified on the internal track: listing/metadata → screenshots → Data safety + content rating → release notes → validate → promote internal→production with a controlled rollout, then watch vitals.

Everything runs with repo tools and the `gpc` (Google Play Console) CLI:
- `gpc` for all Play Console API calls (`GPC_SERVICE_ACCOUNT` / `gpc auth login --service-account <json>`).
- `mobile-app/scripts/store-screenshots.mjs` + Maestro + emulator for captures.
- Listing copy and product ids come from `site-config.ts`.
</objective>

<state_variables>
| Variable | Description |
| --- | --- |
| `{package_name}` | from `site-config.ts > androidPackage`; permanent once the listing exists. |
| `{aab_path}` | the build already uploaded to the internal track (do not rebuild to release). |
| `{from_track}` / `{to_track}` | usually `internal` → `production` (via `closed`/`open` if you stage testers). |
| `{rollout_fraction}` | staged production rollout, e.g. `0.1` (10%) before 100%. |
| `{release_notes}` | per-language "what's new" text (≤500 chars), from `ns-release` or written here. |
</state_variables>

<critical_safety>
- Never commit the service-account JSON, keystore, or any secret. Mask paths in summaries.
- Do NOT run `gpc releases promote`, `gpc publish`, or `gpc listings push` without `--validate-only`/`--dry-run` first AND explicit user confirmation of: package name, Play account, service account, target track, prod Convex URLs, screenshots/listing, and release notes.
- Promote to **production** only after the internal build is verified and the user explicitly confirms.
- Android/web payments use Stripe; do not swap the iOS Apple-IAP product.
</critical_safety>

<phase n="A" title="Preflight">
```bash
command -v gpc && gpc --version
gpc auth login --service-account "/secure/local/google-play-service-account.json"
gpc doctor
gpc status          # confirm the build is on the internal track and healthy
```
Confirm `site-config.ts`: `androidPackage`, `payment.productIds.google`. Stop if the internal build isn't verified.
</phase>

<phase n="B" title="Store screenshots">
Generate/refresh Play screenshots (it emits Android sizes), then upload:
```bash
# capture/QA workflow: .agents/skills/ns-generate-store-screenshots/SKILL.md
gpc listings images upload --lang en-US --type phoneScreenshots ./documents/store-screenshots/android/*.png
```
</phase>

<phase n="C" title="Listing + metadata">
Sync the store listing (title, short/full description, graphics) from local metadata:
```bash
gpc listings pull --dir metadata/      # see what's live
# edit metadata/ to match site-config.ts product copy
gpc listings push --dir metadata/
```
</phase>

<phase n="D" title="Compliance gates (Play-specific)">
These are web-only review gates in Play Console — surface them; the user completes them:
- **Data safety** form (what data the app collects/shares).
- **Content rating** questionnaire.
- **Target audience** + ads declaration.
- App access / review notes: demo account `appstoretest@email.com`, OTP `123456`.
Do not fabricate answers — list what's outstanding and let the user fill it.
</phase>

<phase n="E" title="Release notes">
Use the `{release_notes}` passed by `ns-release`, or write a concise per-language "what's new" (≤500 chars). Keep it user-facing, not a commit dump.
</phase>

<phase n="F" title="Validate, promote, roll out">
Validate, then promote the EXISTING internal build to production with a staged rollout — never a fresh upload:
```bash
gpc releases promote --from internal --to production --rollout 0.1 --notes "{release_notes}" --dry-run
# user confirms ↓
gpc releases promote --from internal --to production --rollout 0.1 --notes "{release_notes}"
gpc watch --track production --on-breach halt        # monitor crash/ANR vitals
# after the staged rollout looks healthy, go to 100%:
gpc releases promote --to production --rollout 1.0
```
</phase>

<failure_modes>
- **"version already used"** → you tried to upload a new AAB instead of promoting the internal build; promote, don't re-upload.
- **Release blocked by Data safety / content rating** → those forms are incomplete in Play Console (phase D).
- **Rollout halted by vitals** → crash/ANR breach; investigate before resuming, don't force 100%.
- **Purchases fail in review** → Play managed product id ≠ `payment.productIds.google`, or not activated.
</failure_modes>

<success_metrics>
- The internal build is promoted to the production track (no rebuild) with a staged rollout.
- Listing, screenshots, Data safety, and content rating are complete.
- Release notes are set; promoted to 100% only after vitals look healthy and the user confirms.
</success_metrics>
