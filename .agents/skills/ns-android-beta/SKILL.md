---
name: ns-android-beta
description: Build and upload a NowStack Mobile Android beta to a Play internal or closed testing track. Use for build Android, Android beta, internal testing, signed AABs, prod Convex wiring, or shipping Android to testers before ns-android-distribute.
---

# Android Beta - NowStack Mobile

Take a NowStack Mobile app from local dev to an installable build on a Play **testing track** (internal first, then closed). This is the Android beta surface — the equivalent of iOS TestFlight. For the production release (promote to the production track + listing + staged rollout) use `ns-android-distribute`. The deep Google Play Console (gpc) tool reference is `.agents/skills/ns-deploy-android-app/SKILL.md` — read it for the upload/track commands. Run the steps here in order.

<prerequisites>
Ask once, as a group (the agent cannot create these):
1. **Google Play Developer account** (one-time $25, verified).
2. **A Play Console app** for the package name in `site-config.ts > androidPackage`.
3. **A Play service-account JSON** with the Google Play Developer API enabled (for `gpc`/fastlane upload).
4. **Expo account** logged in (`npx eas-cli@latest whoami`) if building with EAS.
</prerequisites>

<step n="1" title="Preflight">
```bash
npm run check-setup          # easProjectId must be real (Android builds need EAS too)
cd mobile-app && npx tsc --noEmit && npm run lint
```
Confirm `site-config.ts`: `androidPackage`, `payment.productIds.google`, `version`. Package name is permanent once the Play listing exists.
</step>

<step n="2" title="Convex production + eas.json">
Same prod backend as iOS — if `ns-ios-testflight` already wired prod Convex + `eas.json`, reuse it. Otherwise follow `docs/production-checklist.md` stage 1, and ensure `mobile-app/eas.json > build.production.env` has the **prod** Convex URLs (the build bakes them in).
</step>

<step n="3" title="Build a signed AAB">
```bash
cd mobile-app
eas build --platform android --profile production
```
EAS manages the Android keystore (first build prompts to generate one; let EAS keep it). Download the `.aab` artifact when the build reaches FINISHED. (Local Gradle build is an alternative if the user avoids EAS.)
</step>

<step n="4" title="In-app product (if the app sells anything)">
Create the managed product / subscription in Play Console with the EXACT id from `site-config.ts > payment.productIds.google`. Activate it before submitting, or purchases fail review.
</step>

<step n="5" title="Upload to the internal track">
Use `gpc` (see `ns-deploy-android-app`): authenticate with the service account, `gpc preflight` / `gpc validate`, then upload the `.aab` to the **internal** track for testing:
```bash
gpc preflight "{aab_path}" --fail-on error
gpc publish "{aab_path}" --track internal --validate-only   # dry run first
gpc releases upload "{aab_path}" --track internal
gpc status
```
Always validate before a real upload. **Stop here** — promoting beyond internal (closed/production) is `ns-android-distribute`'s job.
</step>

<step n="6" title="Test the build">
Add testers to the internal track in Play Console, install via the opt-in link, and verify the app reaches the prod Convex backend and the purchase flow works. When the build is verified, you're ready for `ns-android-distribute` (production listing, metadata, review, staged rollout).
</step>

<failure_modes>
- **Upload rejected: package name mismatch** → the AAB package ≠ `androidPackage` in `site-config.ts`/Play listing.
- **App opens but can't reach backend** → AAB built before `eas.json` had prod Convex URLs; rebuild.
- **Purchases fail in review** → the Google managed product id doesn't match `payment.productIds.google`, or isn't activated.
- **Signing/keystore confusion** → let EAS own the keystore; don't mix locally-generated and EAS keystores across builds.
</failure_modes>

<success_metrics>
- Signed `.aab` for the correct package, pointing at the prod Convex deployment.
- Uploaded to the **internal** track and installable by testers; purchase flow tested.
- Hands off to `ns-android-distribute` for the production release (listing, Data safety, content rating, staged rollout).
</success_metrics>
