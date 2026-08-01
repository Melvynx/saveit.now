---
name: ns-preview
description: Mirror an explicit NowStack iOS Simulator through serve-sim into a live browser preview, then drive the app from that browser. Use for `/ns preview`, showing the Expo app, or collecting browser-visible mobile UI proof.
---

# NS Preview

<objective>
Expose the real NowStack iOS Simulator through a local `serve-sim` URL, open it in whatever browser the agent can control, and use that browser to look at and interact with the running app. No Expo or Xcode project changes. `ns-ios-verification` still owns app launch, auth, deep links, backend read-back, and the PASS/FAIL verdict.
</objective>

<preflight>
Read `.agents/rules/verification.md`, `.agents/rules/launch-app.md`, and `.agents/skills/ns-ios-verification/SKILL.md`. Require macOS, Xcode Simulator, and one explicit Simulator UDID. Reuse a healthy app/Metro runtime when possible; do not rebuild or restart user-owned processes just to create the mirror.
</preflight>

## One workflow, any harness

There is no host-specific path. Every agent runs the same four things: get a UDID, get the app rendering, start `serve-sim`, open the URL in a controllable browser. If the harness has no browser it can drive, run `open "<url>"` for the user and label the browser stream `NOT VERIFIED`.

### 1. Pick one explicit UDID

```bash
xcrun simctl list devices available
```

Never pass `booted` once more than one Simulator may be active. Every later `simctl` call in the session addresses that same UDID.

### 2. Get the app actually rendering

Boot the device, install the build, start Metro on an explicit port, launch, and point the dev client at Metro. `ns-ios-verification` owns this; the short form is:

```bash
SIM="<simulator-udid>"
BUNDLE_ID="$(/usr/libexec/PlistBuddy -c 'Print :CFBundleIdentifier' "<path-to>.app/Info.plist")"

xcrun simctl boot "$SIM"; xcrun simctl bootstatus "$SIM" -b
xcrun simctl install "$SIM" "<path-to>.app"
xcrun simctl launch "$SIM" "$BUNDLE_ID"
xcrun simctl openurl "$SIM" "<slug>://expo-development-client/?url=http%3A%2F%2Flocalhost%3A8081"
```

Read the bundle id from the installed `Info.plist` rather than from `site-config.ts`. An older dev build can carry a stale bundle id, and `simctl launch` with the config value fails with `FBSOpenApplicationServiceErrorDomain code=4`. When the two disagree, say so in the report: JS still streams from Metro, but nothing native or config-level since that build is present. The fix is `cd mobile-app && npm run ios`.

### 3. Start the mirror, scoped to that UDID

Keep it in its own long-running terminal. `serve-sim` exits when the device shuts down under it (`FrameCapture Code=2 "Device not booted"`), so supervise it rather than assuming one start lasts the session:

```bash
SIM="<simulator-udid>"

cleanup_serve_sim() {
  npx --yes serve-sim@latest --kill "$SIM" >/dev/null 2>&1 || true
}
trap 'cleanup_serve_sim; exit 0' EXIT INT TERM HUP
cleanup_serve_sim

while true; do
  if [ "$(xcrun simctl list devices | grep "$SIM" | grep -c Booted)" -eq 0 ]; then
    sleep 3
    continue
  fi
  npx --yes serve-sim@latest --host 127.0.0.1 "$SIM"
  cleanup_serve_sim
  sleep 3
done
```

Wait for readiness before opening anything:

```bash
until curl -sf --max-time 3 -o /dev/null http://127.0.0.1:3200; do sleep 2; done
```

### 4. Open the printed URL in a controllable browser

Use the exact URL `serve-sim` prints. Take a screenshot and confirm a real Simulator frame with app content, not just a page shell. A `live` badge, the device name, and recognizable app UI are the proof. HTTP 200 is not.

## Driving the app from the browser

The mirror is a real input channel. Clicking and scrolling in it is normal preview interaction, not `computer-use`, and it is the fastest way to walk a screen and confirm a change landed. Use it freely for app UI.

Two limits worth knowing:

- **Simulator system layers do not receive mirror taps.** iOS alerts such as "Apple Account Verification" float above the app and swallow clicks sent through the preview. Get back to the app with `xcrun simctl terminate "$SIM" "$BUNDLE_ID"` then `launch`, rather than clicking at the alert repeatedly.
- **Route setup stays on `simctl`.** For a specific screen, deep link it (`xcrun simctl openurl "$SIM" "<slug>://(app)/(tabs)/<route>"`, route group segment included) instead of tapping through navigation. Deterministic beats pixel-hunting.

Never type credentials, API keys, or personal data into the mirrored Simulator, and never complete a system sign-in sheet that appears there. Back out with Cancel and relaunch the app.

<safety>
Never run an unscoped `serve-sim --kill`; another task may own a different Simulator. Keep the preview bound to `127.0.0.1` and never expose its shell-enabled control surface to a LAN or public interface. Do not edit `.xcodeproj`, `.xcworkspace`, Expo config, schemes, or build settings to enable previewing. Do not use the Swift-package preview launcher for this Expo/React Native app. Use `trash` for any temp file cleanup.
</safety>

<report>
Report the Simulator name and UDID, the app and its installed bundle id, whether that bundle id matches `site-config.ts`, the Metro port, the preview URL, the browser used, whether a real Simulator frame was observed, the screenshot artifact, and any interaction left unverified. Stop short of PASS when only the page shell loaded. State plainly when the mirror crashed and was restarted.
</report>
