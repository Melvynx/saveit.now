---
name: ns-notification
description: Set up NowStack Mobile push notifications with Expo, Convex, EAS/APNs, settings, logs, admin tests, and iOS verification. Use for "notifications", "push", "ns notification", or misspellings like "ns-notifciation".
---

# ns-notification - Push notifications for NowStack Mobile

<objective>
Implement and verify the full push notification stack for a NowStack Mobile app:
mobile token capture, Convex storage/preferences/logging, backend delivery through
Expo Push, product-triggered notifications, admin diagnostics, and iOS/APNs setup.

This skill is based on a completed production notification rollout:
- App ID was created with `In-App Purchase`, `Sign in with Apple`, and `Push Notifications` enabled.
- Working code stored Expo push tokens per device, respected per-user/couple preferences, logged every delivery attempt, and exposed admin test sends.
- The iOS release path needed an APNs push credential fix before TestFlight push delivery was reliable.
</objective>

<first_steps>
1. Read `AGENTS.md`.
2. Read `.agents/rules/mobile-app.md`, `.agents/rules/auth-payments-storage.md`, `.agents/rules/store-release.md`, `.agents/rules/verification.md`, and `.agents/rules/typescript-and-code-style.md`.
3. Before editing `convex/**`, read `convex/_generated/ai/guidelines.md` and `.agents/rules/convex.md`.
4. Read at least one existing authenticated mobile layout, one Convex auth helper file, and one admin route before editing.
5. For current Expo API details, use the `find-docs` skill against official Expo docs before changing library-specific calls.
6. If iOS, App Store Connect, APNs, EAS credentials, entitlements, or TestFlight are involved, read `references/ios.md`.
</first_steps>

<source_reference>
This skill is derived from a completed notification rollout, but it must stay
portable. Do not reference machine-specific absolute paths, private repo names,
or private commit hashes. When implementing in the current repo, look for or
create the equivalent local files:

```text
mobile-app/lib/notifications.ts
mobile-app/app/(app)/_layout.tsx
mobile-app/app/(app)/notification-settings.tsx
convex/notifications/
convex/admin/notifications.ts
convex/crons.ts
```
</source_reference>

<architecture>
Build this as a vertical slice. Do not leave token capture, delivery, or diagnostics half-wired.

1. **Mobile client**
   - Use `expo-notifications` and `expo-constants`.
   - Set a global notification handler so foreground notifications show a banner/list entry without noisy sound by default.
   - Request permission, create the Android channel before requesting/getting a token, and call `Notifications.getExpoPushTokenAsync({ projectId })`.
   - Resolve `projectId` from `Constants.expoConfig?.extra?.eas?.projectId` with `Constants.easConfig?.projectId` as fallback.
   - Register the token only after the user is authenticated; reset the one-shot guard on sign-out.
   - Register tap handling once in the authenticated app layout, including the cold-start response from `getLastNotificationResponseAsync`.
   - Route backend data hints like `{ type, route, reviewId, month }` to real Expo Router paths including route groups.

2. **Convex schema**
   - Add `pushTokens`: `userId`, `token`, `platform`, optional `deviceId`, optional `disabledAt`, `createdAt`, `updatedAt`.
   - Add `notificationPreferences`: `userId`, `coupleId`, a master `pushEnabled`, per-notification toggles, `updatedAt`.
   - Add `notificationLogs`: `coupleId`, `recipientUserId`, `type`, `status`, optional `payload`, optional `error`, optional `sentAt`, `createdAt`.
   - Index for exact access patterns: by token, by user, by user+token, by user+couple, by couple, by couple+status, by status.

3. **Convex API**
   - Public authenticated mutation: register or reactivate a token by token string. If the token exists under another user, re-point it to the current user.
   - Public authenticated mutation: disable a token on sign-out or invalidation.
   - Public authenticated query/mutation: read and update the caller's preferences for their active couple.
   - Internal recipient helpers: load active couple members, effective preferences with defaults, and a bounded list of active tokens per user.
   - Internal action delivery: send through `https://exp.host/--/api/v2/push/send`, parse Expo tickets, classify accepted/rejected, and log every sent/failed/skipped attempt.

4. **Product triggers**
   - Trigger notifications from product events, not from UI-only code.
   - Keep notification content privacy-safe. Do not expose raw private answers or sensitive user data; send status-only copy.
   - Typical triggers: cycle/check-in prompt, partner completion, missed action reminder, monthly review ready, AI/product nudge.
   - Use Convex scheduler/crons for recurring prompts and reminders. Keep batch sizes bounded.

5. **Admin diagnostics**
   - Add admin queries for recent logs and recent users with active tokens.
   - Add an admin action to send a test notification to a selected active member.
   - In UI, show only token previews, never full Expo tokens.
   - Include sent/accepted/rejected/token-count result text so delivery failures are diagnosable.
</architecture>

<ios_gate>
Read `references/ios.md` before any iOS credential or TestFlight work. The short version:

- App Store Connect App ID must have Push Notifications enabled before provisioning profiles are generated.
- EAS must have an APNs push key for the Apple team. This is separate from the distribution certificate and provisioning profile.
- The app must have a real `extra.eas.projectId`; token registration should pass it explicitly to `getExpoPushTokenAsync`.
- A dev build or TestFlight build is required. Expo Go is not a proof for this app.
- Regenerate/reinstall iOS credentials if the App Store provisioning profile predates the Push Notifications capability.
</ios_gate>

<workflow>
1. **Diagnose**
   - Check `site-config.ts` for `title`, `slug`, `bundleId`, `appleTeamId`, and `easProjectId`.
   - Check `mobile-app/package.json` for `expo-notifications`.
   - Check whether `mobile-app/app.config.ts` exposes `extra.eas.projectId`.
   - Search for existing notification code before adding new modules:
     ```bash
     rg -n "expo-notifications|pushTokens|notificationPreferences|notificationLogs|registerPushToken|sendTestNotification" mobile-app convex
     ```

2. **Plan**
   - List the mobile, Convex, admin, iOS credential, and verification changes.
   - Get explicit user confirmation before creating/changing external Apple/EAS resources, APNs keys, signing credentials, builds, uploads, or TestFlight sends.

3. **Implement**
   - Keep code split cleanly: mobile helper, authenticated layout wiring, Convex `notifications/` modules, admin diagnostics, product trigger call sites.
   - Run Convex codegen after schema/function changes.
   - Keep delivery in Convex actions, not mutations or queries, because actions can call external HTTP.

4. **Verify locally**
   ```bash
   npm run check-setup
   npx convex dev --once
   cd mobile-app && npx tsc --noEmit
   cd mobile-app && npm run lint
   cd mobile-app && npx expo config --type public
   ```

5. **Verify iOS delivery**
   - Use `ns-ios-verification` for simulator navigation/tap routing.
   - For real remote push delivery, use a dev build on a capable device/simulator or a TestFlight build with APNs credentials present.
   - Send an admin test notification and inspect `notificationLogs` for `sent`, `failed`, or `skipped` with the Expo ticket payload.
</workflow>

<pitfalls>
- Missing `extra.eas.projectId` causes Expo token lookup failures. Pass `projectId` explicitly.
- Android 13+ may not show the permission prompt until a notification channel exists; create the channel first.
- APNs keys are scarce and account-wide. Do not revoke or recreate casually.
- A signing profile can exist while push delivery still fails because the APNs push key is missing from EAS.
- A push token without an authenticated user is useless for product notifications. Register tokens after auth.
- Do not store raw private answers, secrets, `.p8`, `.p12`, provisioning profiles, or full push tokens in UI/debug output.
- Do not use `rm -rf`; use `trash` for generated directories or temp files.
</pitfalls>
