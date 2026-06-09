# Phase 13 — Mobile App (Expo)

**Goal:** wire `apps/mobile` to the shared Convex backend with Better Auth using the
**nowstack-mobile** pattern (bearer tokens + SecureStore), and replace the cookie-based REST client with
Convex queries/mutations.

**Reference:** `nowstack-mobile/mobile-app/lib/auth-client.ts`, `mobile-app/app/_layout.tsx`,
`mobile-app/lib/auth-store.tsx`, `mobile-app/app/(auth)/signup.tsx`, `mobile-app/app.config.ts`,
`mobile-app/metro.config.js`.

**Current SaveIt mobile to change:** `apps/mobile/src/lib/auth-client.ts`,
`apps/mobile/src/lib/api-client.ts` (cookie REST), screens that call it.

**Depends on:** Phase 02 (`expo()` plugin already in `createAuth`), 05 (bookmark functions), 07 (search),
09 (checkout).

---

## 0. Screen inventory (what actually changes)
`apps/mobile` uses **expo-router** (`app/` dir). Migrate each screen's data layer from
`src/lib/api-client.ts` (cookie REST) to Convex hooks:

| File | Role | Migration |
| --- | --- | --- |
| `app/_layout.tsx` | root providers | add Convex + `ConvexBetterAuthProvider` (§3) |
| `app/(tabs)/_layout.tsx` | tab nav + auth gate | gate on `authClient.useSession()`; redirect to sign-in |
| `app/(tabs)/index.tsx` | bookmarks list + search | `usePaginatedQuery(api.bookmarks.queries.list)` + `useAction(api.search.actions.search)` |
| `app/(tabs)/settings.tsx` | account/limits/sign-out | `api.subscriptions.queries.getMine`, limits, `signOut()` |
| `app/bookmark/[id].tsx` | bookmark detail | `useQuery(api.bookmarks.queries.get)` (reactive processing) |
| `app/share-handler.tsx` | **OS share-sheet save** | `useMutation(api.bookmarks.mutations.create)` — core flow, must keep working |
| `app/bug-report-modal.tsx` | bug report | `useMutation` (feedback table) instead of `/api/bug-report` |
| `app/index.tsx` | entry redirect | route on `isAuthenticated` + onboarding state |
| `src/screens/SignInScreen.tsx` | auth | new `authClient` flows (§5) |
| `src/screens/OnboardingScreen.tsx` | onboarding | set `user.onboarding` via a mutation |
| `app/goodbye.tsx` | account deletion | BA delete-account client API |

> `share-handler.tsx` is the share-extension entry that lets users save a URL from any app. It must call
> `api.bookmarks.mutations.create` with the shared URL and (where available) auth from SecureStore.

## 1. Shared backend access
- Add `@workspace/backend` + the `@convex/*` alias to `apps/mobile/tsconfig.json`.
- `apps/mobile/metro.config.js`: add the repo root + `packages/backend` to `watchFolders` so the
  generated `_generated` types hot-reload (model: nowstack-mobile metro config).
- `.env`: `EXPO_PUBLIC_CONVEX_URL` (.convex.cloud) + `EXPO_PUBLIC_CONVEX_SITE_URL` (.convex.site).
  Drop `EXPO_PUBLIC_AUTH_URL` / `EXPO_PUBLIC_API_URL`.

## 2. Auth client (bearer + SecureStore)
`apps/mobile/src/lib/auth-client.ts`:
```ts
import { createAuthClient } from "better-auth/react";
import { convexClient } from "@convex-dev/better-auth/client/plugins";
import { emailOTPClient } from "better-auth/client/plugins";
import { expoClient } from "@better-auth/expo/client";
import * as SecureStore from "expo-secure-store";
import Constants from "expo-constants";

export const authClient = createAuthClient({
  baseURL: process.env.EXPO_PUBLIC_CONVEX_SITE_URL,
  plugins: [
    expoClient({ scheme: "saveit", storagePrefix: "saveit", storage: SecureStore }),
    emailOTPClient(),
    convexClient(),
  ],
});
```

## 3. Providers
`apps/mobile/app/_layout.tsx` (or RN entry) — provider order (model: nowstack-mobile):
```
GestureHandlerRootView → PostHogProvider → (StripeProvider?) →
  ConvexProvider client={convex} →
    ConvexBetterAuthProvider client={convex} authClient={authClient} →
      <App/Stack>
```
`const convex = new ConvexReactClient(process.env.EXPO_PUBLIC_CONVEX_URL!, { unsavedChangesWarning: false })`.

## 4. Data access
Replace `api-client.ts` cookie calls with `convex/react` hooks:
- bookmarks list/detail/create/update/delete → `useQuery`/`useMutation` on `api.bookmarks.*`.
- search → `useAction(api.search.actions.search)` (actions, not reactive).
- tags → `api.tags.*`.
- Use the `useQuery(fn, isAuthenticated ? {} : "skip")` pattern to avoid unauthenticated calls.
- `/api/user/limits` → `api.subscriptions.queries.getMine` + `billing` limits query.
- `/api/bug-report` → a Convex mutation (or feedback table).

## 5. Auth flows (mobile)
`apps/mobile` sign-in screen — port nowstack-mobile flows applicable to SaveIt:
- **Email OTP**: `authClient.emailOtp.sendVerificationOtp` → `authClient.signIn.emailOtp`.
- **Google**: `authClient.signIn.social({ provider: "google", callbackURL: "saveit://" })`
  (expo-web-browser + deep link; `expoClient` handles the callback).
- **Apple** (optional, iOS): native `expo-apple-authentication` `idToken` flow; requires
  `ios.usesAppleSignIn: true`, `appBundleIdentifier` in the backend Apple provider, and
  `APPLE_CLIENT_ID/SECRET` Convex env.
- **GitHub** if desired (browser redirect).

## 6. Deep links / config
`apps/mobile/app.json` (or app.config): `scheme: "saveit"`, set iOS bundle id + Android package.
`trustedOrigins` in `convex/auth/config.ts` already includes `saveit://` and `exp://` (Phase 02).

## 7. Checkout (mobile)
Replace `POST /api/mobile/checkout` with `useAction(api.stripe.actions.createCheckout)` opening the
Checkout URL in `expo-web-browser`. (If iOS IAP is ever required, that's a separate effort — Stripe
checkout via browser is the v1 path.)

## Acceptance criteria
- Sign in via OTP + Google (+ Apple on iOS) works; session persists across app restarts (SecureStore).
- Bookmarks list/detail/create/search work against Convex; processing progress updates live.
- Upgrade opens Checkout and reflects `pro` after webhook.

## Risks
- Two URLs confusion: `.convex.cloud` for the Convex client, `.convex.site` for the auth `baseURL`.
- Deep-link scheme mismatch → OAuth never returns. Keep `scheme` == `expoClient.scheme` == trustedOrigin.
- Metro must watch the backend folder or types/codegen go stale.
