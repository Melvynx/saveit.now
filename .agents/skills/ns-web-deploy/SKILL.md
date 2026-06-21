---
name: ns-web-deploy
description: Deploy the NowStack Mobile web app to production on Vercel with the Convex backend shipped alongside it. Use when the user says "deploy my app", "deploy the web app", "ship to production", "go live", or needs CONVEX_DEPLOY_KEY / the Vercel build wired so the backend never drifts behind the frontend.
---

# Web Deploy - NowStack Mobile

Deploy `web-app/` (TanStack Start) to Vercel so that **Convex and the frontend ship together** on every commit. The Vercel build runs `convex deploy` first, then builds the site — without this, the frontend ships against a stale backend. Run these steps IN ORDER; never skip the deploy-key step (Step 2 is the one teams forget).

<critical>
- **The `nitro` Vite plugin is mandatory.** TanStack Start builds a host-agnostic bundle; only `nitro()` turns it into a Vercel build (`.vercel/output`). WITHOUT it Vercel ships a plain SPA (`dist/client`) and **every route 404s** — the site looks deployed but is dead. This is the #1 reason a fresh project's first deploy fails. Step 1 verifies it.
- **Deploy from the REPO ROOT with `--archive=tgz`, never from `web-app/`.** The Vercel CLI uploads only the directory it runs in. From `web-app/` the build's `cd ..` / `npm --prefix ..` can't reach the root `convex/` folder (exit 254). From the repo root the monorepo exceeds Vercel's 15 000-file inline limit, so `--archive=tgz` is required. Git push to `main` avoids both and is the preferred path.
- `VITE_CONVEX_URL` is injected by `convex deploy --cmd-url-env-var-name` at build time — NEVER hardcode it, so the site always matches the deployment it just shipped.
- `CONVEX_DEPLOY_KEY` must be a Convex **production** deploy key, set on Vercel **Production only**. The build fails loudly without it — by design.
- The deploy key, `.p8`, and any secret are never committed or printed.
- The web app must be live before iOS App Store review (privacy + terms URLs are review gates) — this skill is a prerequisite for `ns-ios-distribute`.
</critical>

<step n="1" title="Confirm the build wiring (already in the repo)">
Two things must be true. `npm run check-setup` verifies both — they MUST pass:

```bash
npm run check-setup    # "web-app/vercel.json" AND "web-app nitro plugin" checks MUST pass
```

1. **`web-app/vercel.json`** runs `npm run build:vercel` →
   `cd .. && npx convex deploy --cmd 'cd web-app && npm run build' --cmd-url-env-var-name VITE_CONVEX_URL`.
2. **The `nitro` host preset** is wired so SSR routes serve on Vercel.

If either is missing (older project), restore them:

```jsonc
// web-app/vercel.json
{ "installCommand": "npm install && npm --prefix .. install", "buildCommand": "npm run build:vercel" }
// web-app/package.json scripts:
// "build:vercel": "cd .. && npx convex deploy --cmd 'cd web-app && npm run build' --cmd-url-env-var-name VITE_CONVEX_URL"
```

```ts
// web-app/vite.config.ts — add the nitro plugin (after tanstackStart(), before react()/tailwind())
import { nitro } from "nitro/vite";
// plugins: [ tanstackStart({...}), nitro(), viteReact(), tailwindcss() ]
// and add "nitro": "^3.0.260610-beta" to web-app dependencies, then `cd web-app && npm install`.
```

Sanity-check locally that the build emits the Vercel output (Node 22):

```bash
cd web-app && VERCEL=1 npm run build   # must end with "Generated .vercel/output/nitro.json"; trash .vercel/output after
```
</step>

<step n="2" title="Provision the Vercel project (ALWAYS run this)">
```bash
vercel link                 # run from the REPO ROOT; pick/create the project
npm run setup:vercel        # from repo root
```

`setup:vercel` (`scripts/setup-vercel-convex.mjs`):
- **Sets the Vercel project Root Directory = `web-app`** automatically via the Vercel API (using the token the CLI already stored), so Vercel reads `web-app/vercel.json`. If it can't (no token), it prints the one manual step.
- Mints a Convex **production** deploy key (`convex deployment token create --prod`) and sets `CONVEX_DEPLOY_KEY` (Production) + `VITE_CONVEX_SITE_URL` (auth) + `VITE_EMAIL_CONTACT` on Vercel.

Idempotent — safe to re-run; `npm run setup:vercel -- --force` rotates the key.

Link at the **repo root** (not `web-app/`) so a CLI deploy uploads the whole monorepo. Root Directory = `web-app` then makes Vercel build inside `web-app/`, where `..` reaches the root `convex/` folder.

Prefer the dashboard? Convex → Settings → Deploy keys → "Generate production deploy key", add it to Vercel as `CONVEX_DEPLOY_KEY` (Production), and set Root Directory = `web-app` under Settings → Build & Deployment.
</step>

<step n="3" title="Deploy and verify">
**Preferred — push to `main`.** Vercel's Git integration checks out the whole repo (no file-count limit) and builds in `web-app/`:

```bash
git push origin main
```

**CLI alternative — from the REPO ROOT with `--archive=tgz`:**

```bash
vercel --prod --archive=tgz     # repo root, NOT web-app/ (see <critical>)
```

Confirm in the build log that Convex deployed and Nitro produced the Vercel output:

```
> cd .. && npx convex deploy --cmd 'cd web-app && npm run build' --cmd-url-env-var-name VITE_CONVEX_URL
- Running 'cd web-app && npm run build' with environment variables "VITE_CONVEX_URL" and "CONVEX_SITE_URL" set...
✓ built in ...
ℹ Generated .vercel/output/nitro.json     # ← the Nitro→Vercel preset ran
```

Then check the deployment is Ready and **hit the routes** (a SPA-404 regression only shows here, not in the build):

```bash
for p in / /privacy /cgv /support /app /admin; do
  echo "$p -> $(curl -s -o /dev/null -w '%{http_code}' https://<your-domain>$p)"
done
# every public route must be 200 (not 404). Sign in and confirm /app and /admin.
```
</step>

<step n="4" title="Domain (first launch only)">
Add the custom domain in Vercel project settings, then create the CNAME at your DNS provider (Cloudflare: CNAME subdomain → `cname.vercel-dns.com`, proxy off until verified). After the final domain is set, update `site-config.ts > urls` + `auth.trustedOrigins` and `convex/siteConfig.ts > auth.trustedOrigins`, then redeploy.
</step>

<failure_modes>
- **Site deployed but every route 404s (NOT_FOUND)** → the `nitro` plugin is missing, so Vercel served a SPA. Wire `nitro()` (Step 1) and redeploy. The build log will NOT show "Generated .vercel/output" when it's missing.
- **`Error: Invalid request: 'files' should NOT have more than 15000 items`** → you deployed the monorepo inline from the repo root. Add `--archive=tgz`, or just push to `main`.
- **`Command "npm install && npm --prefix .. install" exited with 254`** → you ran `vercel --prod` from `web-app/`, so only `web-app/` uploaded and `..` is empty. Deploy from the repo root (with `--archive=tgz`) or push to `main`.
- **Build error: "no Convex deployment configuration found / CONVEX_DEPLOY_KEY"** → run Step 2 (`npm run setup:vercel`). The classic "web deployed but Convex never updated" bug.
- **Vercel ignores the build command** → Root Directory is not `web-app`, so `web-app/vercel.json` is not read. Re-run `npm run setup:vercel` (it sets it) or fix it in project settings.
- **Frontend can't reach the backend in prod** → `VITE_CONVEX_URL` was hardcoded to a dev URL, or the deploy ran without the key. Re-run Step 2 and redeploy.
- **`convex deploy` can't find functions** → the build did not `cd ..`; the `convex/` folder lives at the repo root, not in `web-app/`.
</failure_modes>

<success_metrics>
- `npm run check-setup` "web-app/vercel.json" AND "web-app nitro plugin" checks pass.
- `CONVEX_DEPLOY_KEY` (Production) + `VITE_CONVEX_SITE_URL` set on Vercel; Root Directory = `web-app`.
- A production build log shows `convex deploy` running, then the frontend build, then `Generated .vercel/output/nitro.json`, and the deployment is Ready.
- Every public route (`/`, `/privacy`, `/cgv`, `/support`) returns 200 — not 404.
- No secret committed or printed.
</success_metrics>
