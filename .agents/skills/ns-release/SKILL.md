---
name: ns-release
description: Cut a NowStack Mobile release by bumping version, generating changelog and release notes, and promoting tested TestFlight and Play internal builds. Use for release the app, ship latest TestFlight version, release v1.2, publish update, or cut a release.
---

# Release - NowStack Mobile

Ship the version that's already on TestFlight (iOS) and the Play internal track (Android) to production — with a real changelog and a version bump. This skill **does not build**; it bumps the version, writes the changelog/release notes, and hands the existing beta builds to `ns-ios-distribute` and `ns-android-distribute` for the production submission. If there's no build on a testing track yet, run `ns-ios-testflight` / `ns-android-beta` first.

<objective>
Turn "the beta build is verified" into "a versioned, documented production release" with one orchestrated flow: pick the version, generate the changelog, write store release notes, bump version files, then promote per platform and tag the release.
</objective>

<scope>
- **What this owns:** version bump, changelog/release-notes generation, git tag, and orchestrating the per-platform production submission.
- **What it delegates:** the actual store submission — iOS → `ns-ios-distribute`, Android → `ns-android-distribute` (which promotes the internal build to production).
- **What it never does:** rebuild the app, or upload a fresh binary. Production ships the binary that testers already validated.
</scope>

<phase n="1" title="Preflight">
```bash
git status --short            # clean tree; commit/stash first
git rev-parse --abbrev-ref HEAD
```
- Confirm a verified build exists on each target surface: TestFlight (iOS) and the Play internal track (Android). Skip a platform the user isn't releasing.
- Ask which platforms to release (iOS, Android, or both).
</phase>

<phase n="2" title="Pick the version">
Read the current marketing version (single source for the human-facing version):
```bash
grep -m1 "version:" mobile-app/app.config.ts        # e.g. version: '1.0.0'
node -p "require('./mobile-app/package.json').version"
```
Decide the bump with the user: `patch` (fixes), `minor` (features), `major` (breaking). Compute the new semver `X.Y.Z`.

Native build numbers (iOS `buildNumber`, Android `versionCode`) are auto-incremented by EAS (`mobile-app/eas.json > autoIncrement: true`) — do NOT hand-edit them.
</phase>

<phase n="3" title="Generate the changelog">
Collect commits since the last release tag:
```bash
LAST=$(git describe --tags --abbrev=0 2>/dev/null || echo "")
git log ${LAST:+$LAST..}HEAD --no-merges --pretty="- %s"
```
From that list produce TWO things:
1. **`CHANGELOG.md` entry** — a new `## vX.Y.Z — <date>` section (developer-facing, grouped by feat/fix/chore). Prepend it under the title; pass the date in, don't invent one.
2. **Store release notes** — a concise, user-facing "what's new" (≤500 chars, no commit hashes, no internal jargon). This is what App Store / Play reviewers and users read.

Show both to the user and let them edit before anything ships.
</phase>

<phase n="4" title="Bump version files">
Set the new `X.Y.Z` in both files (keep them in sync):
- `mobile-app/app.config.ts` → `version: 'X.Y.Z'`
- `mobile-app/package.json` → `"version": "X.Y.Z"`

Commit the bump + changelog together:
```bash
git add mobile-app/app.config.ts mobile-app/package.json CHANGELOG.md
git commit -m "chore(release): vX.Y.Z"
```
</phase>

<phase n="5" title="Promote to production (per platform)">
Hand the store submission to the distribute skills, passing the store release notes from phase 3. Confirm with the user before each store mutation.
- **iOS** → follow `.agents/skills/ns-ios-distribute/SKILL.md` (submits the TestFlight build for App Store review with the new version + release notes).
- **Android** → follow `.agents/skills/ns-android-distribute/SKILL.md` (promotes the internal build to the production track with a staged rollout + release notes).

These can run in parallel; report each platform's outcome separately.
</phase>

<phase n="6" title="Tag the release">
After the submissions are accepted/queued, tag and push:
```bash
git tag vX.Y.Z
git push && git push --tags
```
The tag becomes the baseline for the next release's changelog (phase 3).
</phase>

<rules>
- Never rebuild or upload a new binary here — promote the validated beta build. A rebuild means a new, untested binary in production.
- Store mutations (App Store submit, Play production promote) always need explicit user confirmation; the iOS App Store review submission and the Android 100% rollout each get their own confirmation.
- Keep `app.config.ts` and `package.json` versions identical. Don't touch `buildNumber`/`versionCode` — EAS owns them.
- Release notes are user-facing prose, not a commit dump.
</rules>

<success_metrics>
- New semver in `app.config.ts` + `package.json`, committed with the changelog and tagged `vX.Y.Z`.
- `CHANGELOG.md` has a dated entry; store release notes written and approved.
- Each requested platform's existing beta build is promoted to production (no rebuild), each confirmed by the user.
</success_metrics>
