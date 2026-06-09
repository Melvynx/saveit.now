# Spec 11 — Mobile App (Expo) Porting Spec

> Phase reference: `13-mobile.md`
> Depends on: Phase 02 (auth backend), Phase 05 (bookmarks/tags), Phase 07 (search), Phase 09 (billing)

---

## 1. Source File Inventory

### Configuration files

| File | Responsibility |
|---|---|
| `apps/mobile/package.json` | Declares `@saveit/mobile` v2.0.0, expo ~53, expo-router ~5.1.4, `better-auth` 1.2.8, `@better-auth/expo` 1.2.8, `@better-auth/stripe` 1.2.8, `expo-share-intent` 4.1.2, `expo-secure-store` ~14.0.0, `@tanstack/react-query` ^5.76.1, tamagui 1.132.x, zustand ^5.0.2. No Convex packages yet. |
| `apps/mobile/app.json` | Defines app name "SaveIt", slug "saveit-mobile", `scheme: "saveit"`, iOS bundle id `now.saveit.saveitapp`, Android package `now.saveit.saveitapp`, EAS project id `d09eb4d5-85f0-4a4a-9b9e-5ca5cc19d4fa`. Contains `expo-share-intent` plugin with iOS activation rules and Android intent filters (`text/*`, `image/*`, `video/*`). The `env.production.EXPO_PUBLIC_API_URL` is set to `https://saveit.now` — this must be REPLACED by `EXPO_PUBLIC_CONVEX_URL` and `EXPO_PUBLIC_CONVEX_SITE_URL`. |
| `apps/mobile/metro.config.js` | Uses `getDefaultConfig`, sets `watchFolders = [monorepoRoot]`, `resolver.nodeModulesPaths` for both project and monorepo `node_modules`, enables `unstable_enableSymlinks` and `unstable_enablePackageExports`. Does NOT yet watch `packages/backend` specifically — must add `path.resolve(monorepoRoot, 'packages/backend')` to `watchFolders`. |
| `apps/mobile/tsconfig.json` | Extends `expo/tsconfig.base` + `@workspace/typescript-config/base.json`. Has `paths: { "@/*": ["./src/*"] }` but NOT `@convex/*` — must add `"@convex/*": ["../../packages/backend/convex/*"]`. |
| `apps/mobile/eas.json` | EAS build profiles: `development`, `preview`, `production`, `melvynmal`. Production sets `RN_PRIVACY_MANIFEST_AGGREGATION=false`. No Convex env vars here — those go in app `.env` files. |

### Auth and API libraries (CURRENT — to be replaced)

| File | Responsibility |
|---|---|
| `apps/mobile/src/lib/server-url.ts` | Returns auth/API base URL. Priority: `EXPO_PUBLIC_API_URL` env var → `https://saveit.now` (if `!__DEV__`) → `http://localhost:3000`. Used by both auth-client and api-client. **This entire file is removed post-migration**; the two URLs split into `EXPO_PUBLIC_CONVEX_SITE_URL` (Better Auth baseURL) and `EXPO_PUBLIC_CONVEX_URL` (Convex client). |
| `apps/mobile/src/lib/auth-client.ts` | Creates `authClient` via `createAuthClient` from `better-auth/react`. Uses `expoClient` (scheme `"saveit"`, storagePrefix `"saveit"`, storage `SecureStore`), `emailOTPClient()`, and `stripeClient({ subscription: true })`. Base URL comes from `getServerUrl()`. Exports `{ signIn, signUp, signOut, useSession }`. **Must change**: swap `stripeClient` for `convexClient()` from `@convex-dev/better-auth/client/plugins`; change `baseURL` to `process.env.EXPO_PUBLIC_CONVEX_SITE_URL`. |
| `apps/mobile/src/lib/api-client.ts` | Cookie-based REST client wrapping all data calls via `fetch()`. Uses `authClient.getCookie()` to get the cookie and set `Cookie` header (+ `credentials: "include"`). Handles bookmarks list/get/create/update/delete, tags list, user limits, checkout URL, bug report. **This entire class is removed post-migration** — all calls migrate to Convex hooks. |

### Contexts (CURRENT)

| File | Responsibility |
|---|---|
| `apps/mobile/src/contexts/AuthContext.tsx` | Wraps the whole app; manually calls `authClient.getSession()` on mount (5 s timeout), stores `user` + `plan` in React state. Provides `sendOTP`, `verifyOTP`, `signOut`, `signOutWithNavigation`, `refreshPlan`, `refreshPlanWithRetry`. `refreshPlanWithRetry` polls `/api/user/limits` up to 10 times with 2 000 ms delay waiting for `plan === expectedPlan`. **This must be refactored**: replace manual session polling with `authClient.useSession()`, replace `refreshPlan`/`refreshPlanWithRetry` with a Convex reactive query. |
| `apps/mobile/src/contexts/ThemeContext.tsx` | Theme toggling; no data calls — keep as-is. |

### Entry and routing (CURRENT)

| File | Responsibility |
|---|---|
| `apps/mobile/app/_layout.tsx` | Root layout. Provider stack: `QueryClientProvider` (staleTime 5 min, refetchOnWindowFocus false) → `ShareIntentProvider` → `TamaguiProvider` → `AppThemeContext.Provider` → `AuthProvider`. No Convex providers yet. **Must add** `ConvexReactClient` + `ConvexProvider` + `ConvexBetterAuthProvider` here. |
| `apps/mobile/app/index.tsx` | Entry redirect. On mount: if `hasShareIntent || params.dataUrl` → replace to `/share-handler`; else replace to `/(tabs)`. Shows `<OnboardingScreen>` + `<SignInScreen>` modal when `!user && !isLoading`. Uses `useAuth()` from AuthContext. After migration: same logic, but `user` comes from `authClient.useSession()` rather than custom AuthContext. |
| `apps/mobile/app/(tabs)/_layout.tsx` | Two tabs: "Bookmarks" (bookmark icon) and "Settings" (gear icon). Native header search bar placeholder "Search bookmarks...". No data calls. |
| `apps/mobile/app/[...slug].tsx` | Catch-all route. Detects `upgrade/success` in slug → calls `refreshPlanWithRetry("pro")` then redirects to settings. Also detects share intent → `/share-handler`. Otherwise → `/(tabs)`. |

### Screens (CURRENT)

| File | Responsibility |
|---|---|
| `apps/mobile/app/(tabs)/index.tsx` | Wraps `BookmarksScreen`. Wires native header search bar → `searchQuery` prop. |
| `apps/mobile/src/screens/bookmarks-screen.tsx` | Main bookmark list. Uses `useInfiniteQuery` keyed on `["bookmarks", query, types, tags]` calling `apiClient.getBookmarks({ query, cursor, limit: 20, types, tags })`. Hashtag parsing: detects `#word` in query → shows `TagSuggestions`, filters the clean query. Also holds `updateBookmarkMutation` (star/read toggle). Renders `FlatList` with `BookmarkItem`, pull-to-refresh, infinite scroll, type filter badges, tag chips. |
| `apps/mobile/app/(tabs)/settings.tsx` | Settings screen. Reads `{ user, plan }` from `useAuth()`. Displays plan name + limits. Shows `UpgradeButton` when free. Delete-account: calls `authClient.deleteUser({ callbackURL: "/goodbye" })`. Sign-out: calls `signOutWithNavigation`. Opens docs/help via `expo-web-browser`. Navigates to `/bug-report-modal`. |
| `apps/mobile/app/bookmark/[id].tsx` | Bookmark detail (presented as modal). Uses `useQuery(["bookmark", id], () => apiClient.getBookmark(id))`. Mutations for update (`starred`, `read`) and delete. Renders type-specific content: `TweetDetailContent`, `YoutubeDetailContent`, `DefaultDetailContent`. Floating action toolbar (star, read, copy, open, delete). No reactive updates — single fetch only. After migration: use `useQuery(api.bookmarks.queries.get, { id })` which updates automatically during processing. |
| `apps/mobile/app/share-handler.tsx` | OS share-sheet handler (see §4 for full flow). |
| `apps/mobile/app/bug-report-modal.tsx` | Bug report form. Minimum 10 chars. Collects `description`, `deviceInfo` (`Platform.OS + Platform.Version`), `appVersion` (`Constants.expoConfig?.version`). Calls `apiClient.submitBugReport(...)` → POST `/api/bug-report`. After migration: a Convex mutation or direct email action. |
| `apps/mobile/app/goodbye.tsx` | Auto-signs out (via `signOut()`) on mount. Confirmation page after account deletion. |
| `apps/mobile/app/modal.tsx` | Add-bookmark modal (legacy modal route). Calls `apiClient.createBookmark({ url })`. Still relevant after migration for URL-only creates. |
| `apps/mobile/src/screens/SignInScreen.tsx` | Email OTP sign-in sheet (email step → OTP step). Calls `sendOTP(email)` then `verifyOTP(email, otp)` from AuthContext. No social OAuth buttons currently — only email OTP. |
| `apps/mobile/src/screens/OnboardingScreen.tsx` | Marketing/feature display screen shown when unauthenticated. Single CTA: "Sign In with Email". No data calls. |

### Components (CURRENT)

| File | Responsibility |
|---|---|
| `apps/mobile/src/components/bookmark-item.tsx` | Routes to `BookmarkItemYoutube`, `BookmarkItemTweet`, or `BookmarkItemPage` based on type. Placeholder images from `https://codelynx.mlvcdn.com/images/2025-07-28/placeholder.png` and `placeholder-favicon.png`. |
| `apps/mobile/src/components/tag-suggestions.tsx` | Calls `apiClient.getTags({ q: searchText, limit: 20 })` via react-query key `["tags", searchText]`. Shows horizontal scrollable tag chips. |
| `apps/mobile/src/components/upgrade-button.tsx` | Calls `apiClient.getCheckoutUrl({ annual, successUrl, cancelUrl })` then opens `checkoutUrl` in `expo-web-browser`. On browser close, calls `refreshPlanWithRetry("pro")`. |
| `apps/mobile/src/components/type-filter-badges.tsx` | UI only, no data calls. |
| `apps/mobile/src/components/bookmark-item-tweet.tsx` | Tweet-specific list item render. |
| `apps/mobile/src/components/bookmark-item-youtube.tsx` | YouTube-specific list item render. |
| `apps/mobile/src/components/Header.tsx` | Header UI. |

---

## 2. Current Authentication: Cookie vs Bearer

### Current mechanism (to be replaced)

- Auth is currently **cookie-based** between the mobile app and the TanStack Start web server at `EXPO_PUBLIC_API_URL` (`https://saveit.now` in production, `http://localhost:3000` in development).
- `auth-client.ts` is initialized with `baseURL: getServerUrl()` pointing at the web server, not a standalone auth server.
- `expoClient` plugin stores auth tokens in `expo-secure-store` under keys prefixed `saveit`.
- `api-client.ts` calls `authClient.getCookie()` to get the persisted cookie string and sets it as the `Cookie` header on every fetch request, plus `credentials: "include"`.
- There is no bearer-token header (`Authorization: Bearer ...`) — the current implementation passes the cookie as a raw header, which works because `expoClient` from `@better-auth/expo` provides `getCookie()` that returns the serialized cookie value.
- `stripeClient({ subscription: true })` from `@better-auth/stripe` is included in the auth client plugins — this must be **removed** and replaced with `convexClient()`.

### Target mechanism (post-migration)

Per the overview's global convention #10 and Phase 13:
- `EXPO_PUBLIC_CONVEX_SITE_URL` = `<deployment>.convex.site` — for Better Auth HTTP (`authClient.baseURL`).
- `EXPO_PUBLIC_CONVEX_URL` = `<deployment>.convex.cloud` — for the Convex WebSocket client (`ConvexReactClient`).
- Auth becomes **bearer tokens** stored in `SecureStore` via `expoClient`. The `expoClient` plugin from `@better-auth/expo` handles the token lifecycle (storage, retrieval, refresh) transparently.
- `convexClient()` from `@convex-dev/better-auth/client/plugins` replaces `stripeClient` — it bridges the Better Auth session to Convex's auth system.
- Drop `EXPO_PUBLIC_API_URL` entirely.

---

## 3. Environment Variables

### Current (to be dropped after migration)

```
EXPO_PUBLIC_API_URL=http://localhost:3000       # .env.development
EXPO_PUBLIC_API_URL=https://saveit.now          # .env.production (also in app.json env.production)
```

### Target (to be added)

```
EXPO_PUBLIC_CONVEX_URL=<deployment>.convex.cloud
EXPO_PUBLIC_CONVEX_SITE_URL=<deployment>.convex.site
```

The `app.json` `env.production` block must be updated to drop `EXPO_PUBLIC_API_URL` and instead set the two Convex vars (or they live only in `.env.production`).

---

## 4. Share-Handler Flow (Critical Path)

File: `apps/mobile/app/share-handler.tsx`

This is the core mobile feature. The share-sheet save flow must be preserved exactly.

### Entry point
`expo-share-intent` captures the OS share event. `ShareIntentProvider` (in `_layout.tsx`) makes the intent available via `useShareIntentContext()`. When the app launches via share, `index.tsx` detects `hasShareIntent || params.dataUrl` and routes to `/share-handler` before the user can see any other screen.

### Shared content parsing (must preserve exactly)

```
shareIntent.webUrl present
  → url = shareIntent.webUrl
  → metadata.title = shareIntent.text || ""

shareIntent.text present (no webUrl)
  → URL regex: /(https?:\/\/[^\s]+)/g
  → if match: url = urlMatch[0], metadata.title = text.replace(url, "").trim()
  → if no match: url = shareIntent.text, metadata.isTextNote = true

shareIntent.files[0] present (no text/webUrl)
  → if mimeType starts with "image/":
      url = `placeholder-image-upload-${Date.now()}`
      metadata = { type: "image", fileName, mimeType, fileSize }
      imageFile = { uri: file.path, name: file.fileName || `image-${Date.now()}.${ext}`, type: file.mimeType }
      → call createBookmark with imageFile (multipart)
      → EARLY RETURN (skips the url check below)
  → else:
      url = file.path
      metadata = { type: "file", fileName, mimeType, fileSize }

if !url → abort (no-op)
```

### Current API call
```ts
apiClient.createBookmark({ url, metadata, imageFile? })
// POST /api/bookmarks
// JSON body: { url, metadata }
// OR multipart FormData: url field, metadata field (JSON string), image field (file)
```

### Response handling
- `onSuccess`: wait 2 000 ms, then `resetShareIntent()` + `router.dismiss()`
- `onError`: treat as "Already Saved" (the error UI says "This bookmark already exists..."), wait 3 000 ms, then dismiss
- Shows 4 states: loading (pending), success, error ("Already Saved"), share-error (from `expo-share-intent`)

### Deep-link scheme
`app.json` → `scheme: "saveit"`. The `expoClient` in auth-client is configured with `scheme: "saveit"`. OAuth callbacks use `saveit://` deep link. The `[...slug].tsx` catch-all handles `upgrade/success` deep-link path after Stripe checkout.

---

## 5. Current REST API Calls → Convex Mapping

### bookmarks list (GET /api/bookmarks)

**Current**: `apiClient.getBookmarks({ query?, cursor?, limit: 20, types?: string[], tags?: string[] })`

Web server performs `cachedAdvancedSearch({ userId, query, tags, types, specialFilters, limit, cursor, matchingDistance: 0.1 })`. Returns:
```json
{
  "bookmarks": [ { "id", "url", "title", "preview", "starred", "read", "createdAt", "summary", "type", "faviconUrl", "status", "metadata": { "youtubeId?", "tweetId?", "text?", "user?", "mediaDetails?", "width?", "height?", "price?", "currency?", "brand?" }, "tags": [{ "tag": { "id", "name", "type" } }] } ],
  "hasMore": boolean,
  "nextCursor": string | undefined
}
```

**Target Convex**: `usePaginatedQuery(api.bookmarks.queries.list, { query?, types?, tags? })` or equivalent paginated query. The `Bookmark` type shape returned must match this structure so `BookmarkItem`, `BookmarkItemYoutube`, `BookmarkItemTweet` components render without changes.

Note: The `query` param currently triggers the full advanced search (vector + text fallback). On Convex, if `query` is non-empty it should call `api.search.actions.search` (as an action) instead of the paginated query. The mobile client uses `useInfiniteQuery` from react-query today; post-migration the same `usePaginatedQuery` Convex hook or a manual react-query wrapping `useAction` for search results works.

### bookmark get (GET /api/bookmarks/:id)

**Current**: `apiClient.getBookmark(id)` → `GET /api/bookmarks/${id}` → returns `{ bookmark: Bookmark }` (unwrapped to `.bookmark` by client).

**Target Convex**: `useQuery(api.bookmarks.queries.get, { id })` — returns single bookmark, reactive (updates auto during processing).

### bookmark create (POST /api/bookmarks)

**Current**: `apiClient.createBookmark({ url, metadata?, imageFile? })`
- Without image: `POST /api/bookmarks` with JSON `{ url, metadata }`
- With image: multipart FormData with fields `url`, `metadata` (JSON string), `image` (file blob)

Server calls `parseBookmarkBody` then `createBookmark({ url, userId, transcript, metadata })`. Returns `{ status: "ok", bookmark }`.

**Target Convex**: `useMutation(api.bookmarks.mutations.create)` called with `{ url, metadata? }`. Image upload case: first upload image to R2 via `api.files.actions.uploadImage` (Convex action), get back a CDN URL, then pass that URL as the bookmark URL or in metadata. The `placeholder-image-upload-${Date.now()}` URL pattern used today must be replaced.

### bookmark update (PATCH /api/bookmarks/:id)

**Current**: `apiClient.updateBookmark(id, { starred?, read? })` → `PATCH /api/bookmarks/${id}` with JSON body.

Server validates: `read` only allowed when `type === "ARTICLE" || type === "YOUTUBE"`. Returns `{ bookmark }`.

**Target Convex**: `useMutation(api.bookmarks.mutations.update)` with `{ id, starred?, read? }`. The type validation for `read` must be re-enforced server-side in the Convex mutation.

### bookmark delete (DELETE /api/bookmarks/:id)

**Current**: `apiClient.deleteBookmark(id)` → `DELETE /api/bookmarks/${id}`. Returns `{ success: true, bookmark: result }`.

**Target Convex**: `useMutation(api.bookmarks.mutations.delete)` with `{ id }`.

### tags list (GET /api/tags)

**Current**: `apiClient.getTags({ q?, cursor?, limit? })` → `GET /api/tags?q=&cursor=&limit=`. Server does case-insensitive `contains` search on `name`, cursor pagination by `id > cursor`. Returns:
```json
{ "tags": [{ "id", "name", "type" }], "nextCursor": string | null, "hasNextPage": boolean }
```

**Target Convex**: `useQuery(api.tags.queries.list, { q?, cursor?, limit? })` returning same shape.

### user limits (GET /api/user/limits)

**Current**: `apiClient.getUserLimits()`. Server fetches active subscription from DB, calls `getAuthLimits(subscription, metadata)`. Returns:
```json
{
  "plan": "free" | "pro",
  "limits": { "bookmarks": number, "monthlyBookmarkRuns": number, "canExport": number, "apiAccess": number },
  "customLimits": ...,
  "subscription": { "id", "status", "periodEnd" } | null
}
```

**Target Convex**: `useQuery(api.subscriptions.queries.getMine)` (or `api.billing.queries.getLimits`). The `AuthContext.fetchUserPlan()` + `refreshPlanWithRetry()` polling logic (10 retries × 2 s = 20 s) is replaced by a reactive Convex query — when the Stripe webhook lands and the mutation updates the subscription row, the mobile client sees the update automatically within milliseconds.

### checkout URL (POST /api/mobile/checkout)

**Current**: `apiClient.getCheckoutUrl({ annual, successUrl, cancelUrl })` → `POST /api/mobile/checkout`. Server calls Stripe `checkout.sessions.create` with:
- `customer`: existing `stripeCustomerId` from DB user row (or `customer_email` if none)
- `mode: "subscription"`
- `line_items: [{ price: STRIPE_PRO_MONTHLY_PRICE_ID or STRIPE_PRO_YEARLY_PRICE_ID, quantity: 1 }]`
- `success_url`, `cancel_url` from body
- `allow_promotion_codes: true`
- `metadata: { userId, plan: "pro" }`
- `subscription_data.metadata: { userId, plan: "pro" }`

Returns `{ checkoutUrl: session.url }`.

**Target Convex**: `useAction(api.stripe.actions.createCheckout)` with `{ annual, successUrl, cancelUrl }`. Same Stripe parameters must be preserved.

### bug report (POST /api/bug-report)

**Current**: `apiClient.submitBugReport({ description, deviceInfo?, appVersion? })`. Server sends email via Resend:
- `to: "help@saveit.now"`
- `subject: "Bug Report from ${user.email}"`
- HTML template with user.email, user.id, description (newlines → `<br>`), deviceInfo, appVersion, timestamp
- `replyTo: user.email`

**Target Convex**: A Convex action `api.feedback.actions.submitBugReport` (new, to be created) that calls Resend with the same email template. Or alternatively a mutation storing feedback in a `feedbackReports` table (simpler, avoids Node action for email). Decision: follow the pattern in Phase 10 (email actions). Must use `"use node"` if calling Resend SDK directly.

---

## 6. Provider Stack Changes

### Current `_layout.tsx` stack
```
QueryClientProvider (staleTime: 300000, refetchOnWindowFocus: false)
  ShareIntentProvider
    TamaguiProvider
      AppThemeContext.Provider
        Theme
          AuthProvider          ← custom context wrapping Better Auth manually
            <Stack>
```

### Target `_layout.tsx` stack (per Phase 13 §3)
```
ConvexProvider client={new ConvexReactClient(EXPO_PUBLIC_CONVEX_URL, { unsavedChangesWarning: false })}
  ConvexBetterAuthProvider client={convex} authClient={authClient}
    ShareIntentProvider
      TamaguiProvider
        AppThemeContext.Provider
          Theme
            <Stack>
```

`QueryClientProvider` is removed (no more react-query data calls — all data goes through Convex hooks). However, `upgrade-button.tsx` and other components currently use `useMutation` from `@tanstack/react-query`. These must be converted to `useMutation` from `convex/react` or `useConvexMutation` from `@convex-dev/react-query`.

The `AuthProvider` custom context is **removed**. Auth state comes from `authClient.useSession()` (provided by `ConvexBetterAuthProvider`).

---

## 7. AuthContext Replacement Details

All current consumers of `useAuth()` must be updated:

| Current usage | Replacement |
|---|---|
| `user` (from `useAuth()`) | `authClient.useSession().data?.user` |
| `plan` (from `useAuth()`) | `useQuery(api.subscriptions.queries.getMine)` |
| `isLoading` | `authClient.useSession().isPending` |
| `sendOTP(email)` | `authClient.emailOtp.sendVerificationOtp({ email, type: "sign-in" })` |
| `verifyOTP(email, otp)` | `authClient.signIn.emailOtp({ email, otp })` |
| `signOut()` | `authClient.signOut()` |
| `refreshPlan()` | Convex query reactivity (no manual refresh needed) |
| `refreshPlanWithRetry("pro")` | Listen to `useQuery(api.subscriptions.queries.getMine)` — it updates reactively. Keep a short poll as fallback for the `upgrade/success` redirect in `[...slug].tsx` if needed, but prefer reactive. |

The `DEFAULT_LIMITS` constant (bookmarks: 20, monthlyBookmarkRuns: 20, canExport: 0, apiAccess: 0) is the free-tier default — this must match `billing/plans.ts` `FREE_PLAN.limits` in the Convex backend.

---

## 8. Deep Links and OAuth

### Current scheme
`app.json`: `scheme: "saveit"`. Used in `expoClient({ scheme: "saveit" })`.

### OAuth redirect handling
`[...slug].tsx` handles deep-link routing:
- `upgrade/success` path → refresh plan + go to settings
- Share intent → `/share-handler`
- Default → `/(tabs)`

### Required `trustedOrigins` (Phase 02 backend)
The Convex backend `BETTER_AUTH_TRUSTED_ORIGINS` must include:
- `saveit://` (iOS/Android deep-link scheme)
- `exp://` (Expo Go dev)
- `https://saveit.now` (web)
- Browser extension origins

### Apple Sign-In (optional)
`app.json` currently does NOT have `ios.usesAppleSignIn: true`. Phase 13 marks Apple sign-in as optional. If added: need `ios.usesAppleSignIn: true` in `app.json`, `APPLE_CLIENT_ID` + `APPLE_CLIENT_SECRET` as Convex env vars, and the native `expo-apple-authentication` flow using `idToken`.

### Google OAuth
Currently NOT implemented (no social sign-in buttons in `SignInScreen.tsx`). Phase 13 specifies: `authClient.signIn.social({ provider: "google", callbackURL: "saveit://" })` using `expo-web-browser` + deep link handled by `expoClient`.

---

## 9. New Packages Required

Add to `apps/mobile/package.json`:

```json
"convex": "^1.x",
"@convex-dev/react": "^0.x",
"@convex-dev/better-auth": "^0.x"
```

Remove or keep (review):
- `@better-auth/stripe` — remove (replaced by `convexClient`)
- `@tanstack/react-query` — remove after all data calls converted to Convex hooks (keep temporarily during migration)

---

## 10. Metro Config Changes

`apps/mobile/metro.config.js` must add `packages/backend` to watch folders so Convex generated types hot-reload:

```js
config.watchFolders = [
  monorepoRoot,
  path.resolve(monorepoRoot, 'packages/backend'),
];
```

Also add resolver alias for `@convex/*`:
```js
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  '@convex': path.resolve(monorepoRoot, 'packages/backend/convex'),
};
```

---

## 11. TypeScript Config Changes

`apps/mobile/tsconfig.json` must add the `@convex/*` path:

```json
"paths": {
  "@/*": ["./src/*"],
  "@convex/*": ["../../packages/backend/convex/*"]
}
```

---

## 12. Bookmark Data Shape Parity

The mobile `Bookmark` interface (from `api-client.ts`) that the current components depend on is:

```ts
interface Bookmark {
  id: string;
  url: string;
  title?: string;
  preview?: string;          // R2/CDN URL for screenshot
  starred: boolean;
  read: boolean;
  createdAt: string;
  summary?: string;
  type?: BookmarkType;       // "VIDEO" | "ARTICLE" | "PAGE" | "IMAGE" | "YOUTUBE" | "TWEET" | "PDF" | "PRODUCT"
  faviconUrl?: string;
  status: "PENDING" | "PROCESSING" | "READY" | "ERROR";
  metadata?: {
    youtubeId?: string;
    tweetId?: string;
    text?: string;
    user?: { name: string; screen_name: string; profile_image_url_https: string };
    mediaDetails?: Array<{ media_url_https: string; type: string }>;
    width?: number;
    height?: number;
    price?: number;
    currency?: string;
    brand?: string;
  };
  tags: Array<{ tag: { id: string; name: string; type: string } }>;
}
```

The Convex `bookmarks` table schema (Phase 04) must produce a document shape that maps to this interface, or a DTO layer must translate it. The `tags` nested structure (`tags[].tag.{id, name, type}`) is a join shape from Prisma — on Convex it will be a separate `bookmarkTags` table. The mobile UI code directly accesses `bookmark.tags[].tag.name` and `bookmark.tags[].tag.id` so the query return value must include the same nested shape.

---

## 13. Convex Target Functions

Per Phase 13 and the target architecture (Phase 05, 07, 09):

| Current call | Target Convex function | Type |
|---|---|---|
| `apiClient.getBookmarks(params)` | `api.bookmarks.queries.list` (paginated) | `query` |
| `apiClient.getBookmark(id)` | `api.bookmarks.queries.get` | `query` |
| `apiClient.createBookmark({ url, metadata })` | `api.bookmarks.mutations.create` | `mutation` |
| `apiClient.updateBookmark(id, { starred?, read? })` | `api.bookmarks.mutations.update` | `mutation` |
| `apiClient.deleteBookmark(id)` | `api.bookmarks.mutations.delete` | `mutation` |
| `apiClient.getTags({ q?, cursor?, limit? })` | `api.tags.queries.list` | `query` |
| `apiClient.getUserLimits()` | `api.subscriptions.queries.getMine` | `query` |
| `apiClient.getCheckoutUrl({ annual, successUrl, cancelUrl })` | `api.stripe.actions.createCheckout` | `action` ("use node") |
| `apiClient.submitBugReport({ description, deviceInfo, appVersion })` | `api.feedback.actions.submitBugReport` (new) | `action` ("use node") |
| search (via `getBookmarks({ query })`) | `api.search.actions.search` | `action` |

---

## 14. Security and Validation Guards

These must be re-enforced on the Convex side (Phase 17):

1. **Ownership check**: every bookmark operation must verify `bookmark.userId === authUser.id`. Currently done server-side in `prisma.bookmark.findUnique({ where: { id, userId: user.id } })`. Convex equivalent: fetch by `_id`, then assert `.userId === ctx.userId`.

2. **`read` field guard**: `PATCH /api/bookmarks/:id` rejects `read` updates unless `type === "ARTICLE" || type === "YOUTUBE"`. Must replicate in `api.bookmarks.mutations.update`.

3. **Auth gate**: all mutations and queries use `authMutation`/`authQuery` (from `functions.ts`) which derives `userId` server-side from the BA session. Client never passes `userId`.

4. **Bug report validation**: minimum 10 character description (currently in both mobile UI and server `z.string().min(10)`). Must enforce in Convex mutation/action argument validator.

5. **Checkout**: must verify the user is authenticated before creating a Stripe checkout session. No plan check needed (even pro users can re-checkout), but must use the correct `stripeCustomerId` from the Convex user row.

6. **Image upload**: the share-handler image upload path (`placeholder-image-upload-*` URL) must be replaced. Convex action `api.files.actions.uploadImage` must validate file size/type before accepting. Only `image/*` MIME types should be accepted.

---

## 15. Image Share Upload Path (Special Case)

The share-handler currently sets `url = "placeholder-image-upload-${Date.now()}"` and passes the image as a multipart form field. The web server's `POST /api/bookmarks` calls `parseBookmarkBody` which handles multipart.

On Convex there is no multipart form handler. The replacement flow:

1. Mobile detects `mimeType.startsWith("image/")` in share intent.
2. Call `api.files.actions.uploadR2` (or a generateUploadUrl + upload pattern) to upload the image bytes to R2. This is a Convex action with `"use node"` using the S3 SDK.
3. Receive back an R2/CDN URL (e.g. `https://<R2_URL>/...`).
4. Call `api.bookmarks.mutations.create` with `{ url: r2Url, metadata: { type: "image", fileName, mimeType, fileSize } }`.

This is a **two-step mutation** in Convex whereas today it was one multipart POST.

---

## 16. Known Gotchas and Edge Cases

1. **Two-URL confusion**: `EXPO_PUBLIC_CONVEX_SITE_URL` (`.convex.site`) is the HTTP endpoint for Better Auth; `EXPO_PUBLIC_CONVEX_URL` (`.convex.cloud`) is the WebSocket endpoint for Convex data. Mixing them causes silent failures (401 on auth calls or connection errors on data queries).

2. **Metro symlink + package exports**: `metro.config.js` already enables `unstable_enableSymlinks` and `unstable_enablePackageExports` — these are required for `better-auth/react` to resolve correctly. Keep both when adding Convex.

3. **`expoClient` scheme must match exactly**: `scheme: "saveit"` in `expoClient(...)`, `scheme: "saveit"` in `app.json`, and `saveit://` in `trustedOrigins`. A mismatch causes OAuth callbacks to never return.

4. **`refreshPlanWithRetry` polling removal**: the current 10-retry × 2 s loop in `AuthContext` is a workaround for the lag between Stripe webhook and DB update. With Convex reactivity, the `useQuery(api.subscriptions.queries.getMine)` update fires within ~100 ms of the webhook mutation. The `[...slug].tsx` `upgrade/success` handler can simply wait for the query to return `plan === "pro"` reactively rather than polling.

5. **`useSession` timing on app boot**: the current `AuthContext` uses a 5 s timeout on `authClient.getSession()`. With `ConvexBetterAuthProvider`, the session is derived from `SecureStore` + Convex auth token; the `authClient.useSession().isPending` flag covers the loading state.

6. **`hasShareIntent` and `params.dataUrl`**: the share-intent detection in `index.tsx` checks both `hasShareIntent` (from `expo-share-intent`) and `params.dataUrl` (URL param). This dual check must be preserved.

7. **Catch-all route `[...slug].tsx`**: this handles OAuth deep-link returns (`saveit://upgrade/success`, `saveit://auth/callback`, etc.) and also share-intent fallback. It must remain after migration; only the `refreshPlanWithRetry` call changes to a Convex query watch.

8. **`deleteUser` callback URL**: `authClient.deleteUser({ callbackURL: "/goodbye" })` sends a confirmation email with a link. The callback URL `/goodbye` must be a valid route — it already exists as `app/goodbye.tsx` which auto-signs out. On Convex, the BA `deleteUser` confirmation email is sent via the Resend email action.

9. **`expo-share-intent` plugin in `app.json`**: the iOS activation rules (`NSExtensionActivationSupportsWebURLWithMaxCount: 1`, `NSExtensionActivationSupportsWebPageWithMaxCount: 1`, `NSExtensionActivationSupportsImageWithMaxCount: 5`, `NSExtensionActivationSupportsMovieWithMaxCount: 1`, `NSExtensionActivationSupportsText: true`) and Android intent filters (`text/*`, `image/*`, `video/*`) are native config — they survive the Convex migration unchanged.

10. **Convex `_generated` types**: `packages/backend/convex/_generated/api.d.ts` is currently almost empty (`defineSchema({})` only). The `@convex/*` alias in `tsconfig.json` and Metro will only provide type safety after Phases 02–05 generate the full schema and functions.

11. **`react-native-youtube-iframe` uses WebView**: `bookmark/[id].tsx` embeds a YouTube player. This component has no data dependency — it uses `bookmark.metadata.youtubeId` directly. Ensure the Convex bookmark document returns `metadata.youtubeId` in the same field path.

12. **`credentials: "include"` in fetch calls is RN-specific behavior**: once all REST calls are removed, there are no more raw `fetch` calls needing credential management. The `api-client.ts` class is completely deleted.
