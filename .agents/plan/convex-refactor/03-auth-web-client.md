# Phase 03 — Auth Web Client (TanStack Start)

**Goal:** wire the web app (cookie-based) to Convex Better Auth, with SSR auth in loaders and the
existing sign-in/up UI ported to the new client.

**Reference:** `nowstack-saas/src/lib/{auth-client.ts,auth-server.ts}`, `src/router.tsx`,
`src/routes/__root.tsx`, `src/-providers.tsx`, `src/routes/api/auth/$.ts`,
`src/lib/auth/auth-user.ts`, `src/routes/(logged-in)/route.tsx`.

**Current SaveIt files to change:** `apps/web/src/providers.tsx` (Convex provider already added),
`apps/web/src/router.tsx`, `apps/web/src/routes/__root.tsx`, `apps/web/src/lib/auth-client.ts`,
`apps/web/src/routes/api.auth.$.ts`, sign-in pages under `apps/web/src/features/auth/*`.

---

## 1. Auth client (replaces Prisma-based client)

`apps/web/src/lib/auth-client.ts`:
```ts
import { createAuthClient } from "better-auth/react";
import { convexClient } from "@convex-dev/better-auth/client/plugins";
import { magicLinkClient, adminClient, emailOTPClient } from "better-auth/client/plugins";
import { apiKeyClient } from "@better-auth/api-key/client";   // CORRECTED: not in better-auth/client/plugins in 1.x
import { getServerUrl } from "./server-url";

export const authClient = createAuthClient({
  baseURL: getServerUrl(),                 // app origin; auth routes proxy to convex.site
  plugins: [
    magicLinkClient(), adminClient(), emailOTPClient(), apiKeyClient(),
    convexClient(),                        // REQUIRED — exchanges BA session for Convex token
  ],
});
export const { useSession, signOut, signIn } = authClient;
```

## 2. Server bindings (SSR)

`apps/web/src/lib/auth-server.ts`:
```ts
import { convexBetterAuthReactStart } from "@convex-dev/better-auth/react-start";
const convexUrl = import.meta.env.VITE_CONVEX_URL ?? process.env.VITE_CONVEX_URL ?? "";
const convexSiteUrl = import.meta.env.VITE_CONVEX_SITE_URL ?? process.env.VITE_CONVEX_SITE_URL ?? "";
export const { handler, getToken, fetchAuthQuery, fetchAuthMutation, fetchAuthAction } =
  convexBetterAuthReactStart({ convexUrl, convexSiteUrl, cookiePrefix: "save-it" });
```
> `cookiePrefix: "save-it"` must equal the backend `BETTER_AUTH_COOKIE_PREFIX`.
> **New env var:** `VITE_CONVEX_SITE_URL` does **not** exist yet (`apps/web/src/vite-env.d.ts` only declares
> `VITE_CONVEX_URL`). Add it to `apps/web/.env` and `vite-env.d.ts` (the `.convex.site` URL).

## 3. Auth route proxy

`apps/web/src/routes/api.auth.$.ts` → delegate GET/POST to `handler` from `auth-server.ts`
(replaces the current Better Auth catch-all that ran on Prisma).

## 4. Convex client in router context + provider

- `apps/web/src/router.tsx`: create `new ConvexReactClient(import.meta.env.VITE_CONVEX_URL)` and pass
  as router `context.convexClient` (model: nowstack-saas `router.tsx`) when route context needs the
  client. Do not introduce `ConvexQueryClient` or TanStack Query; client components should use
  `convex/react` directly.
- `apps/web/src/routes/__root.tsx`: wrap the tree in
  `<ConvexBetterAuthProvider client={convexClient} authClient={authClient}>` (from
  `@convex-dev/better-auth/react`). Replace the plain `ConvexProvider` currently in `providers.tsx`.

> Net change to `providers.tsx`: the better-auth provider supplies the Convex client. Keep a single
> `ConvexReactClient`; do not wrap the app in a TanStack `QueryClientProvider`.

## 5. SSR auth helpers + guards

`apps/web/src/lib/auth/auth-user.ts` (model: nowstack-saas):
```ts
import { fetchAuthQuery } from "@/lib/auth-server";
import { api } from "@convex/_generated/api";
export const getSession = async () => { try { return await fetchAuthQuery(api.auth.queries.getSession); } catch { return undefined; } };
export const getUser = async () => (await getSession())?.user;
export const getRequiredUser = async () => {
  const user = await getUser();
  if (!user) throw redirect({ to: "/signin" });
  if (user.banned) throw redirect({ to: "/banned" });
  return user;
};
```
- Logged-in layout route: use `useSession()` client guard + `getRequiredUser()` in `beforeLoad`
  for the authed route group (model: nowstack-saas `(logged-in)/route.tsx`).

## 6. Port sign-in / sign-up UI

Map the existing SaveIt auth pages (`apps/web/src/features/auth/*`, routes `signin`, `verify`,
deleted `signin/page.tsx`) to the new client calls:
- Email OTP: `authClient.emailOtp.sendVerificationOtp({ email, type: "sign-in" })` →
  `authClient.signIn.emailOtp({ email, otp })`.
- Magic link: `authClient.signIn.magicLink({ email, callbackURL: "/app" })`.
- OAuth: `authClient.signIn.social({ provider: "github" | "google", callbackURL: "/app" })`.
- Sign-out: `signOut()`; account deletion / email change via BA client APIs.
- Replace `ChatSnippet`'s `useSession()` usage — same hook name, new client; impersonation still via
  `session.session.impersonatedBy`.

## 7. Replace remaining Prisma-auth consumers
Grep `apps/web/src` for imports of the old `@/lib/auth` (server `auth.api.*`) and route handlers that
read sessions; swap to `fetchAuthQuery(api.auth.queries.getSession)` (SSR) or `useSession()` (client).

## Acceptance criteria
- Sign in via OTP, magic link, GitHub, Google all succeed; session persists across reload (cookie).
- An authed Convex query (`api.auth.queries.getCurrentUser`) returns the user from a component.
- A protected route redirects to `/signin` when logged out (both SSR `beforeLoad` and client guard).
- `pnpm ts` + `pnpm lint` clean in `apps/web`.

## Risks
- Two `ConvexReactClient` instances (one in providers, one in router) → token desync. Use exactly one,
  sourced from router context.
- Cookie prefix mismatch → `fetchAuthQuery` returns no session on SSR. Keep `save-it` everywhere.
