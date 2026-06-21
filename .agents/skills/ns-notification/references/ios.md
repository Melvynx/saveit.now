# iOS source - Expo push, EAS, APNs, and TestFlight

Use this reference whenever notification work touches iOS credentials, Apple
Developer capabilities, App Store Connect, EAS, or TestFlight.

## Proven rollout sequence

A completed Expo/Convex iOS notification rollout showed this sequence worked:

1. Register the App ID for the final bundle identifier.
2. Enable these App ID capabilities together when the native feature set needs them:
   - In-App Purchase
   - Sign in with Apple
   - Push Notifications
3. Create the App Store Connect app record for that bundle ID.
4. Link the EAS project and write `easProjectId` into `site-config.ts`; `app.config.ts` exposes it under `extra.eas.projectId`.
5. Build with production Convex URLs and local credentials when using `credentialsSource: "local"`.
6. Fix APNs push credentials in EAS before validating push delivery.
7. Upload to TestFlight, install the build, register a token, then use admin diagnostics to send a test notification and inspect logs.

## External resources and ownership

Keep these concepts separate:

| Item | Owner | Purpose |
| --- | --- | --- |
| App ID capability `Push Notifications` | Apple Developer | Allows the bundle ID to use APNs. |
| App Store provisioning profile | Apple Developer / EAS credentials | Signs the binary with entitlements, including `aps-environment`. |
| APNs auth key | Apple Developer + EAS credentials | Lets Expo Push service talk to APNs for this Apple team. |
| Expo push token | Device/app install | Identifies one app install for Expo Push delivery. |
| EAS project id | Expo/EAS | Lets `getExpoPushTokenAsync({ projectId })` bind the token to the right Expo project. |

An App Store profile and a distribution certificate are not enough. Expo Push
also needs an APNs key uploaded to EAS for the Apple team.

## Official Expo facts to preserve

The official Expo setup guide says push notifications need user permission, an
Expo push token, and platform credentials. The EAS path is the easiest because
the EAS project stores notification credentials.

The Expo notifications SDK notes that Android channels must be created before
calling `getDevicePushTokenAsync` or `getExpoPushTokenAsync` on Android 13+.

The Expo app-credentials docs note APNs keys are account-level, do not expire,
can be reused by multiple apps, and Apple accounts can have at most two APNs
keys. Do not revoke one without checking every app that depends on it.

## iOS setup checklist

1. Confirm final identifiers:
   ```bash
   grep -n "title:\\|slug:\\|bundleId:\\|appleTeamId:\\|easProjectId:" site-config.ts
   cd mobile-app && npx expo config --type public
   ```

2. Verify App ID capabilities:
   - Bundle ID matches `SiteConfig.bundleId`.
   - `Push Notifications` is enabled.
   - `Sign in with Apple` and `In-App Purchase` stay enabled if the app uses them.

3. Verify EAS project id:
   - `site-config.ts` contains a real UUID, not a placeholder.
   - `mobile-app/app.config.ts` exposes `extra.eas.projectId`.
   - Mobile code calls `Notifications.getExpoPushTokenAsync({ projectId })`.

4. Verify APNs key in EAS credentials:
   ```bash
   cd mobile-app
   npx eas-cli@latest credentials --platform ios
   ```
   Use the interactive credentials manager only after user confirmation. Prefer
   reusing an existing APNs key over creating a new one.

5. Verify provisioning entitlements after building:
   ```bash
   APP="path/to/Built.app"
   codesign -d --entitlements :- "$APP" | plutil -p -
   ```
   Look for `aps-environment`. For an App Store/TestFlight build it should be
   production. If missing, regenerate the profile after enabling Push Notifications.

6. Verify a token registers:
   - Install the dev/TestFlight build.
   - Sign in.
   - Accept notification permission.
   - Confirm a `pushTokens` row exists for the user.

7. Verify delivery:
   - Use the admin test send.
   - Inspect `notificationLogs`.
   - A good result has at least one accepted Expo ticket.
   - `skipped: no active push tokens` means client registration failed.
   - APNs credential errors mean the EAS APNs key/profile path needs repair.

## Commands that are safe by default

These read or validate local state:

```bash
npm run check-setup
cd mobile-app && npx expo config --type public
cd mobile-app && npx tsc --noEmit
cd mobile-app && npm run lint
npx convex dev --once
```

These mutate external state and require explicit confirmation first:

```bash
npx eas-cli@latest credentials --platform ios
npx eas-cli@latest build --platform ios --profile production --local
asc publish testflight ...
```

## What not to do

- Do not create a new APNs key if a reusable account key already exists.
- Do not revoke an APNs key unless every dependent app is accounted for.
- Do not commit `.p8`, `.p12`, `.mobileprovision`, `credentials.json`, or token dumps.
- Do not prove delivery with Expo Go. Use this app's dev build or TestFlight build.
- Do not hide delivery failures; record every failed/skipped attempt in Convex logs.
