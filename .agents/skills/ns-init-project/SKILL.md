---
name: ns-init-project
description: Initialize or rebrand a NowStack Mobile product. Use for repo bootstrap, product brief intake, site-config, AGENTS.md, landing, mobile copy, Convex env, and final validation.
---

# Init Project - NowStack Mobile

<objective>
Initialize this boilerplate as a real product while respecting the split architecture: root Convex backend, `web-app/` TanStack Start site/app/admin, and `mobile-app/` Expo app.
</objective>

<strict_order>
1. Verify repo/remotes/worktree and Convex setup.
2. Collect one product brief or PRD. Do not run a long questionnaire if the user already gave the idea.
3. Update product context in `AGENTS.md` and shared config in `site-config.ts`, then mirror `title`, `slug`, `bundleId`, product ids, and `auth.trustedOrigins` into `convex/siteConfig.ts`.
4. Update visible product copy across `web-app/` and `mobile-app/`, including onboarding images in `mobile-app/app/onboarding/content.ts` and the product id in `mobile-app/App.storekit`.
4b. Apply branding colors in `mobile-app/lib/theme.ts` (the single source of truth — every mobile color resolves from there). Ask whether the app wants **dual theme** (light + dark, ships with a switcher) or a **single theme** (e.g. dark-only). For single-theme apps, follow the **Mono Theme procedure** in `references/theming.md` so the switcher is removed and only one scheme is maintained — never hand-edit scattered hex.
5. Configure backend runtime env in Convex only; never commit secrets. At minimum set `RESEND_API_KEY`, `EMAIL_FROM`, `BETTER_AUTH_SECRET`, `SITE_URL` (sign-in is broken without them).
6. If the user plans store builds, run `cd mobile-app && eas init` and copy the project id into `site-config.ts > easProjectId`; set prod Convex URLs in `mobile-app/eas.json`.
7. Validate changed surfaces with `npm run check-setup` plus the build checks, and summarize remaining manual steps from `docs/production-checklist.md`.
</strict_order>

<rules>
- Keep `CLAUDE.md` as a thin deeplink to `AGENTS.md` if it exists.
- Use `site-config.ts` for product title, slug, bundle id, URLs, auth origins, and payment ids.
- For web copy, edit `web-app/app/routes/` and `web-app/app/components/`.
- For mobile copy, edit `mobile-app/app/`, `mobile-app/components/`, and store metadata docs/templates when relevant.
- For mobile theme/colors, edit only `mobile-app/lib/theme.ts`; never inline hex in screens/components. See `references/theming.md` for the architecture, the color touchpoint checklist, and the Mono Theme (single-theme) procedure.
- For Convex edits, read `convex/_generated/ai/guidelines.md` first.
- Backend runtime secrets belong in Convex env through `npx convex env set KEY value`.
- Local setup-only secrets may stay local, but do not commit `.env*`.
- Do not introduce Prisma, PostgreSQL, Supabase, Firebase, Redis, or DB-mirroring.
- Use `trash` for deleting temporary checklist files.
</rules>

<config_targets>
Read these before editing config or branding:

```bash
sed -n '1,240p' site-config.ts
sed -n '1,220p' AGENTS.md
rg -n "NowStack|nowts|boilerplate|TODO|SaaS" web-app mobile-app convex docs site-config.ts package.json
```

Update only values grounded in the product brief. Do not invent legal company, domain, pricing, store ids, or OAuth credentials.
</config_targets>

<env_groups>
Ask by service group, not one variable at a time:

- Base/Auth: `SITE_URL`, `BETTER_AUTH_SECRET`, trusted origins, OAuth client ids/secrets.
- Email: `RESEND_API_KEY`, sender/contact values.
- Payments: Stripe for web/Android, Apple IAP metadata for iOS, matching `site-config.ts`.
- Files/R2: target names used by `convex/storage/r2.ts`, normally `R2_ENDPOINT`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL`.

Set server-side runtime values in Convex:

```bash
npx convex env set KEY "value"
npx convex env list
```
</env_groups>

<validation>
Always run the setup validator first — it catches placeholder ids, missing Convex env vars, and out-of-sync `convex/siteConfig.ts`:

```bash
npm run check-setup
```

Then run only the checks that match touched surfaces:

```bash
npx convex dev --once
cd web-app && npm run typecheck
cd web-app && npm run build
cd mobile-app && npx tsc --noEmit
cd mobile-app && npm run lint
```
</validation>

<stop_gates>
Stop and ask when:

- GitHub/Convex authentication requires a browser/login prompt.
- Product brief is missing or too vague to update config.
- Secrets or live payment/store operations are required.
- The worktree contains unrelated changes that would be staged/committed.
</stop_gates>
