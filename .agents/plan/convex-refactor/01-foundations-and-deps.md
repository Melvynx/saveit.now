# Phase 01 — Foundations & Dependencies

**Goal:** finalize the shared backend package, install every Convex/auth dependency, and register
Convex components. After this phase `npx convex dev` runs clean with the component graph in place.

**Depends on:** the `packages/backend` (`@workspace/backend`) package already created in setup.

---

## 1. Backend package dependencies

Add to `packages/backend/package.json` `dependencies`:
```jsonc
{
  "convex": "^1.40.0",
  "@convex-dev/better-auth": "^0.12.2",   // match nowstack-saas
  "better-auth": "1.6.10",                // pin; matches @convex-dev/better-auth peer
  "@better-auth/api-key": "1.6.10",       // apiKey moved OUT of better-auth/plugins in 1.x (BREAKING vs SaveIt's 1.2.8)
  "@better-auth/expo": "1.6.10",          // shared backend serves mobile too
  "@convex-dev/resend": "^0.2.3",         // transactional + marketing email
  "convex-helpers": "^0.1.116",           // customQuery/customMutation builders
  "@ai-sdk/google": "^3.0.52",            // Gemini (summaries, embeddings, chat)
  "ai": "^6.0.134",
  "@aws-sdk/client-s3": "^3.1014.0",      // R2 upload from Convex actions
  "cheerio": "^1.2.0",                    // article/product HTML parsing
  "turndown": "^7.2.2",                   // HTML → markdown
  "sharp": "^0.34.5",                     // image metadata/processing (node action)
  "@danielxceron/youtube-transcript": "^1.2.6",
  "react-tweet": "^3.3.0",                // getTweet from react-tweet/api
  "zod": "^4.3.6",
  "ulid": "^3.0.1"                        // bookmark ids parity with current schema
}
```
Add `devDependencies`: `convex-test`, `@edge-runtime/vm`, `vitest` (for backend tests, Phase 15).

> Many of these are heavy Node deps — they only load in `"use node"` action files. Keep them out
> of query/mutation files.

## 2. App-side dependencies

- `apps/web`: already has `convex`, `@convex-dev/react-query`, `@workspace/backend`. Add
  `@convex-dev/better-auth`, `better-auth`, and `@better-auth/api-key` (the web auth client imports
  `apiKeyClient` from `@better-auth/api-key/client`).
- `apps/mobile`: add `convex`, `@convex-dev/better-auth`, `better-auth`, `@better-auth/expo`,
  `expo-secure-store`, `expo-web-browser`, `@workspace/backend`. (Keep `expo-apple-authentication`
  if Apple sign-in is wanted.)
- `apps/chrome-extension` / `apps/firefox-extension`: add `better-auth`, `@convex-dev/better-auth`
  (extension auth client). Convex calls go over the Better Auth HTTP + Convex client.
- Run `pnpm install` from the repo root.

## 3. Register Convex components

Create `packages/backend/convex/convex.config.ts` (model: nowstack-saas):
```ts
import { defineApp } from "convex/server";
import betterAuth from "./betterAuth/convex.config";
import resend from "@convex-dev/resend/convex.config.js";

const app = defineApp();
app.use(betterAuth);   // LOCAL component (see Phase 02) so we can extend the user table
app.use(resend);
export default app;
```

Create `packages/backend/convex/betterAuth/convex.config.ts`:
```ts
import { defineComponent } from "convex/server";
const component = defineComponent("betterAuth");
export default component;
```

## 4. `@convex/*` path alias in every consumer

- `apps/web/tsconfig.json` `paths`: add `"@convex/*": ["../../packages/backend/convex/*"]`.
- `apps/web/vite.config.ts` `resolve.alias`: add
  `"@convex": path.resolve(workspaceRoot, "packages/backend/convex")`.
- `apps/mobile/tsconfig.json`: add the alias, and in `metro.config.js` add the backend folder to
  `watchFolders` (model: `nowstack-mobile/mobile-app/metro.config.js`) so codegen changes hot-reload.
- Extensions: add the alias to their tsconfig/build config.

## 5. Backend scripts & env

- `packages/backend/package.json` scripts already include `dev`, `deploy`, `codegen`, `dashboard`.
- Set backend env on the dev deployment now (real values come later, placeholders OK to start):
  ```bash
  cd packages/backend
  npx convex env set BETTER_AUTH_SECRET "$(openssl rand -base64 32)"
  npx convex env set BETTER_AUTH_COOKIE_PREFIX save-it
  npx convex env set SITE_URL http://localhost:3000
  ```

## Acceptance criteria
- `pnpm install` succeeds; `cd packages/backend && npx convex dev --once` compiles the component graph
  (betterAuth + resend) with no errors.
- `apps/web` still type-checks (`pnpm ts`) and lints clean.
- `@convex/_generated/api` resolves from `apps/web` via the new alias.

## Risks
- `better-auth` / `@convex-dev/better-auth` version skew → use the exact pair from nowstack-saas.
- `sharp` native build can be blocked by pnpm's `ignored build scripts`; run `pnpm approve-builds`
  or add to `pnpm.onlyBuiltDependencies` if codegen complains.
