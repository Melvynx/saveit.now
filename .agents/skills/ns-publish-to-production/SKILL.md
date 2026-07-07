---
name: ns-publish-to-production
description: Publish NowStack Mobile production surfaces. Use for Convex prod, web deploy, production env sync, and coordinating iOS/Android release skills.
---

# Publish To Production - NowStack Mobile

<objective>
Ship the production stack without confusing web deploy with mobile store release. This workflow coordinates Convex prod, `web-app` production deployment, and handoff to the dedicated iOS/Android store skills.
</objective>

<scope>
This skill covers:

- Convex production deployment and env verification.
- `web-app/` production build/deploy preparation.
- Runtime-secret placement between Convex, web public env, and mobile public env.
- Handoff to `ns-ios-deploy-app`, `ns-deploy-android-app`, and `ns-generate-store-screenshots`.

This skill does not submit App Store or Google Play builds directly. Use the dedicated store skills for that.
</scope>

<preflight>
Run/read:

```bash
git status --short --branch
git remote -v
npx convex --version
npx convex env list --prod || true
cd web-app && npm run typecheck
cd web-app && npm run build
cd mobile-app && npx tsc --noEmit
```

Read:

- `site-config.ts`
- `convex/http.ts`
- `convex/auth.ts`
- `convex/storage/`
- `web-app/package.json`
- `mobile-app/package.json`
- `.agents/rules/auth-payments-storage.md`
- `.agents/rules/store-release.md`
</preflight>

<env_rules>
- Convex backend secrets stay in Convex env.
- Do not commit `.env`, `.env.local`, `.env.production`, store keys, App Store `.p8`, Google service account JSON, Stripe secrets, or R2 secrets.
- Web/mobile public env values may exist locally for builds only when they are non-secret and required by the framework.
- iOS production payments use Apple IAP. Do not route iOS production checkout through Stripe.
- Android/web Stripe server logic belongs in Convex.
</env_rules>

<web_deploy>
**Web deploy is owned by the `ns-web-deploy` skill — run it; do not duplicate its steps here.** It covers the full one-shot flow: the mandatory `nitro` Vite plugin (without it Vercel ships a SPA and every route 404s), `web-app/vercel.json` running `convex deploy` so the backend ships with the frontend, `npm run setup:vercel` (deploy key + Root Directory = `web-app`), and deploying from the repo root with `--archive=tgz` or a push to `main`.

Non-negotiables to assert before declaring the web surface done:

- `npm run check-setup` passes the "web-app/vercel.json" AND "web-app nitro plugin" checks.
- `CONVEX_DEPLOY_KEY` (Production) is set so the backend never drifts behind the frontend.
- The build log shows `convex deploy` running AND `Generated .vercel/output/nitro.json`.
- Every public route (`/`, `/privacy`, `/cgv`, `/support`) returns **200, not 404** — a SPA-404 regression only surfaces on the live routes, not in the build.

See `ns-web-deploy` and `docs/production-checklist.md` stage 2 for the step-by-step.
</web_deploy>

<mobile_handoff>
Before declaring production complete:

- Run `ns-generate-store-screenshots` if store screenshots are missing or stale.
- Use `ns-ios-deploy-app` for TestFlight/App Store Connect (`asc` workflow).
- Use `ns-deploy-android-app` for Google Play (`gpc` workflow).
- Verify production Convex URLs and public app URLs match `site-config.ts`.
</mobile_handoff>

<success_criteria>
- Convex prod env is present and verified.
- `web-app` typecheck/build pass.
- Mobile TypeScript passes when mobile config/env changed.
- Store-release work is either completed through dedicated skills or explicitly listed as remaining.
- No production secret is written to git-tracked files.
</success_criteria>
