---
name: ns-ios-verification
description: Verify NowStack Mobile iOS/Expo changes in the Apple Simulator with `xcrun simctl`. Covers single or parallel Metro/device flows, deep-link navigation, preview routes, and OTP sign-in. Use for `ns ios verification`, "test on simulator", or changed `mobile-app/**`; never use computer-use.
---

# ns-ios-verification — Drive the iOS Simulator to prove a mobile change works

<objective>
See a `mobile-app/**` change actually rendered and behaving correctly in the Apple Simulator, using only `xcrun simctl` (screenshots + `openurl` deep links) — no gestures, no computer-use. Supports two modes:

- **Single-agent** — one Simulator, one Metro on `8081`. The default.
- **Multi-agent / parallel** — each agent gets its OWN Simulator device AND its OWN Metro port, so navigation, reloads, and screenshots never cross-talk. This is what makes it safe to verify several screens/flows at the same time.

**NEVER** drive the Simulator (or a browser) with the computer-use / control-the-computer tools. `simctl` for mobile, `dev-browser` for web. Computer-use is a last resort only when explicitly requested.
</objective>

<platform_guard>
iOS verification requires macOS (Xcode + Simulator). `uname -s` must be `Darwin`. A dev build must already exist (`/ns ios local-setup` → `npm run ios` once). Native modules (Stripe, IAP, Apple Sign In) only exist in the dev build, never Expo Go.
</platform_guard>

## Toolchain (every command)

Run Metro/builds with **Node 22** (`eas.json` pins `22.20.0`) and a UTF-8 locale:

```bash
export PATH="$HOME/.nvm/versions/node/v22.20.0/bin:$PATH"
export LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8
```

Node 18 fails reading `app.config.ts` (it `require`s the ESM `site-config.ts`); a non-UTF-8 locale fails CocoaPods `pod install`.

Resolve the slug, bundle id, and built `.app` once:

```bash
cd mobile-app
APP=$(find ~/Library/Developer/Xcode/DerivedData -path '*/Build/Products/Debug-iphonesimulator/*.app' -maxdepth 6 -type d 2>/dev/null | head -1)
BUNDLE_ID=$(/usr/libexec/PlistBuddy -c 'Print CFBundleIdentifier' "$APP/Info.plist")
SLUG=$(/usr/libexec/PlistBuddy -c 'Print CFBundleURLTypes:0:CFBundleURLSchemes:0' "$APP/Info.plist" 2>/dev/null)
echo "slug=$SLUG bundle=$BUNDLE_ID app=$APP"
```

`SLUG` is the deep-link scheme (the default product is `nowstack`; it's the `scheme` in `site-config.ts`/`app.config.ts`). Reading it from the built `.app` `Info.plist` is the reliable source — `app.config.ts` is TS and can't be `require`d by plain Node.

---

## Mode A — Single-agent (default)

Use this exact flow to render one mobile change — no gestures, no computer-use.

1. **One Metro on 8081.** Both dev builds default to Metro port `8081`, so a sibling app's Metro on `8081` makes this app load the WRONG bundle. Free `8081`, then start this app's Metro there (tell the user if you stopped another app's Metro):
   ```bash
   cd mobile-app && npx expo start --port 8081 --dev-client
   ```
2. **Clean launch the dev build** so it connects to `8081` and is foreground (same-app deep links then skip the cross-app "Open in …?" prompt):
   ```bash
   xcrun simctl terminate booted "$BUNDLE_ID"; xcrun simctl launch booted "$BUNDLE_ID"
   ```
3. **Navigate by deep link** to the slug scheme (include the route-group segment, e.g. `(app)/(tabs)/...`):
   ```bash
   xcrun simctl openurl booted "$SLUG://(app)/(tabs)/settings"
   ```
4. **Capture** and Read it:
   ```bash
   xcrun simctl io booted screenshot /tmp/shot.png
   ```
   For a scrolled state without gestures, temporarily add `contentOffset={{ x: 0, y: N }}` to the `ScrollView` (Fast Refresh applies it), screenshot, then revert. Crop with `sips`/PIL to inspect header/detail.

---

## Mode B — Multi-agent isolation (parallel agents)

When several agents (or parallel tasks) drive the app at once, **never share one Simulator on 8081** — every navigate/reload/screenshot from one agent disturbs the others. Give each agent its own autonomous pair: a dedicated Simulator device + a dedicated Metro port. The dev build (`.app`) is identical everywhere — install it on each device, then tell each one which Metro to load.

For each agent (example: agent A → port `8083`):

1. **Dedicated Simulator device** — create + boot a throwaway device, and **install the same dev build** on it (a fresh device has no app):
   ```bash
   UDID_A=$(xcrun simctl create "agent-a" "iPhone 16 Pro")
   xcrun simctl boot "$UDID_A"
   xcrun simctl install "$UDID_A" "$APP"
   ```
2. **Dedicated Metro port** — one per agent (`8083`, `8084`, …), in the background:
   ```bash
   cd mobile-app && EXPO_NO_INTERACTIVE=1 npx expo start --port 8083 --dev-client &
   ```
3. **Point this dev build at its Metro** via the `expo-development-client` deep link. The `url` must be **URL-encoded** (`http://localhost:8083` → `http%3A%2F%2Flocalhost%3A8083`):
   ```bash
   xcrun simctl launch "$UDID_A" "$BUNDLE_ID"
   xcrun simctl openurl "$UDID_A" "$SLUG://expo-development-client/?url=http%3A%2F%2Flocalhost%3A8083"
   ```
4. **Navigate + capture on THAT device** — always the explicit `<udid>`, **never `booted`** (ambiguous once several devices are booted):
   ```bash
   xcrun simctl openurl "$UDID_A" "$SLUG://(app)/(tabs)/settings"
   xcrun simctl io "$UDID_A" screenshot /tmp/agent-a.png
   ```

Agent B repeats with `$UDID_B`, `--port 8084`, and `?url=...8084`. Each agent's navigation/reloads/screenshots stay independent.

**Teardown** throwaway devices when done:
```bash
xcrun simctl shutdown "$UDID_A"; xcrun simctl delete "$UDID_A"
```

> **Pitfalls.** Always address the explicit `<udid>` (never `booted`). The `?url=` value must be URL-encoded. Multiple `expo start` from the same project dir share `.expo/` and the file-watcher — it works on different ports, but if you see cache races add `--clear` to the first or give each a distinct `TMPDIR`. The Simulator shares the host network, so `localhost:<port>` reaches Metro directly (no Android `10.0.2.2`).

---

## Auth-gated screens — two ways to reach signed-in UI

`simctl` cannot type into a `TextInput`, so you do NOT walk the sign-in form by hand. Pick one:

### 1. Temp no-auth preview route (no session — fastest for pure UI)

Render the real screen OUTSIDE the `(app)` auth gate but INSIDE the root providers. Create `mobile-app/app/<name>-preview.tsx`, deep-link to it, screenshot, then **`trash` the file** when done. Force a theme with `useTheme().setPreference('dark')` if the simulator `appearance` doesn't reach a `system` preference.

### 2. Programmatic OTP sign-in (real session — for signed-in data/flows)

Auth is **Better Auth email OTP** (`convex/auth.ts`). The OTP is NOT magic:

- **Built-in test account `appstoretest@email.com` → code is always `123456`.** `generateOTP` hardcodes it and `sendVerificationOTP` returns early — **no Resend / no email needed**. This is THE test login.
- For any OTHER email **with no `RESEND_API_KEY`** on the deployment, the OTP is **logged in the Convex dashboard logs** (`[AUTH] … OTP for <email>: <otp>`) but the send call also throws — so prefer the test account. With `RESEND_API_KEY` set, a real email is sent and the code is NOT in the logs.

To sign in WITHOUT typing, create a TEMP preview route that hits the same two endpoints the sign-in form uses (`mobile-app/app/onboarding/sign-in-form.tsx`), then **`trash` it** after:

```tsx
// mobile-app/app/login-test-preview.tsx — TEMP, trash after verifying
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { authClient } from '@/lib/auth-client';
import { Text } from '@/components/ui/text';

const EMAIL = 'appstoretest@email.com';
const OTP = '123456';

export default function LoginTestPreview() {
  const [status, setStatus] = useState('signing in…');
  useEffect(() => {
    (async () => {
      await authClient.$fetch('/email-otp/send-verification-otp', {
        method: 'POST',
        body: { email: EMAIL, type: 'sign-in' },
      });
      const res = await authClient.$fetch('/sign-in/email-otp', {
        method: 'POST',
        body: { email: EMAIL, otp: OTP },
      });
      setStatus(res.error ? `error: ${res.error.message}` : 'signed in ✓ — deep-link to (app) now');
    })();
  }, []);
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>{status}</Text>
    </View>
  );
}
```

Deep-link to it (`$SLUG://login-test-preview`), wait for "signed in ✓", then navigate to the real `(app)` screens — the session token now lives in SecureStore and `auth-store.tsx` picks it up. To read codes for an arbitrary email when Resend is unset: `npx convex logs` (root) and grep for `[AUTH]`.

---

## Static checks (run alongside the Simulator)

- `cd mobile-app && npx tsc --noEmit` for TypeScript-sensitive changes.
- `cd mobile-app && npm run lint` when touching shared UI or many files.
- `npx convex dev --once` (root) for Convex changes.

## Finish

- `trash` every temp `*-preview.tsx` route you created.
- Shut down + delete any throwaway multi-agent Simulators.
- Report what you verified, on which screen(s), and any verification you skipped + the concrete reason.
