---
name: ns-convex
description: Route NowStack Mobile Convex work to the right skill. Use for underspecified Convex backend, schema, auth, migration, performance, component, or env tasks.
---

# Convex - NowStack Mobile

Use this as the routing skill for Convex work in this repo.

## Mandatory First Step

Before editing anything under `convex/`, read:

```bash
sed -n '1,240p' convex/_generated/ai/guidelines.md
```

Also read `.agents/rules/convex.md` and `.agents/rules/development-commands.md`.

## Route To A Specific Skill

- Auth setup or auth repair: `convex-setup-auth`
- Reusable Convex component: `convex-create-component`
- Schema/data migration: `convex-migration-helper`
- General performance or subscription cost: `convex-performance-audit`
- Database bandwidth, indexes, full scans, documents-read issues: `convex-cost-optimizer`

If a specific skill clearly matches, use that skill instead of staying here.

## Repo Constraints

- Convex is the only backend/database.
- This repo already has Convex configured; do not run generic Convex quickstart flows here.
- Do not add Prisma, PostgreSQL, Supabase, Firebase, Redis, or DB mirroring.
- Shared auth/payment/storage behavior must work across `web-app/` and `mobile-app/`.
- Server secrets belong in Convex env.

## Default Verification

```bash
npx convex dev --once
cd web-app && npm run typecheck
cd mobile-app && npx tsc --noEmit
```
