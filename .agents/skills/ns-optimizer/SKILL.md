---
name: ns-optimizer
description: Optimize NowStack Mobile across Convex, Expo, and TanStack Start. Use for performance, state, subscriptions, rendering, routing, forms, mobile UI, bundle, or data-fetching improvements.
---

# Optimizer - NowStack Mobile

<objective>
Improve performance and architecture in this repo without importing assumptions from the web-only NowStack SaaS app. NowStack Mobile has three surfaces:

- `convex/` for the backend and shared auth/payment/storage logic.
- `web-app/` for TanStack Start landing, `/app`, and `/admin`.
- `mobile-app/` for Expo Router, React Native, NativeWind, store payments, and mobile UX.
</objective>

<first_steps>
1. Identify the affected surface: Convex, web, mobile, or cross-surface.
2. Read the matching rule file before editing:
   - `.agents/rules/convex.md`
   - `.agents/rules/web-app.md`
   - `.agents/rules/mobile-app.md`
   - `.agents/rules/auth-payments-storage.md`
   - `.agents/rules/development-commands.md`
3. Before touching `convex/`, read `convex/_generated/ai/guidelines.md`.
4. Gather the cheapest real signal available: build/typecheck output, route behavior, screen flow, query callsites, logs, or measured slow path.
</first_steps>

<decision_tree>
| Problem | Preferred path |
| --- | --- |
| Convex reads are expensive, `.filter()` scans, missing indexes, high docs read | Use `convex-cost-optimizer` or `convex-performance-audit` first |
| Convex schema/data shape needs a rollout | Use `convex-migration-helper` |
| Web route state, admin rendering, landing bundle, TanStack Router behavior | Work in `web-app/` and verify with web typecheck/build |
| Mobile render jank, onboarding/paywall flow, NativeWind layout, auth store state | Work in `mobile-app/` and verify with TypeScript/lint plus simulator when needed |
| Shared auth, payments, R2, account behavior | Treat Convex + web + mobile as one contract and verify every touched surface |
</decision_tree>

<patterns>
## Convex

- Use indexes for bounded reads; avoid broad `.filter()` on hot paths.
- Keep authorization in Convex helpers and return DTOs suitable for clients.
- Avoid duplicating backend state into local frontend stores when Convex subscriptions can be the source of truth.
- Prefer targeted pagination and summary records only when there is measured or clearly unbounded read cost.

## Web App

- Keep route files under `web-app/app/routes/`.
- Use `@/*`, `@convex/*`, and `@site-config` aliases already configured in `web-app`.
- Keep `/admin` dense and operational; do not optimize by replacing useful tables with marketing-style cards.
- Use existing Base UI/shadcn primitives in `web-app/app/components/ui/` before adding new primitives.

## Mobile App

- Keep screen state local unless it must survive navigation or be shared across screens.
- Use the existing mobile auth/store helpers before adding a new state library.
- Prefer stable dimensions for buttons, footers, headers, and onboarding/paywall surfaces to avoid layout shifts.
- Avoid network-dependent screenshot/store flows; use deterministic demo paths when preparing release assets.

## Cross-Surface

- `site-config.ts` is the shared source for product, URLs, bundle id, payment ids, and auth origins.
- iOS production payments use Apple IAP. Do not replace that with Stripe checkout.
- Android and web may use Stripe, with server-side payment logic in Convex.
- R2 credentials and backend runtime secrets belong in Convex env, not committed app env files.
</patterns>

<verification>
Pick the narrowest set that covers the touched surface:

```bash
npx convex dev --once
cd web-app && npm run typecheck
cd web-app && npm run build
cd mobile-app && npx tsc --noEmit
cd mobile-app && npm run lint
```

For visible web behavior, run `cd web-app && npm run dev` and verify the relevant route. For mobile behavior, use Expo/simulator verification when the change affects navigation, native APIs, payments, screenshots, or layout.
</verification>

<anti_patterns>
- Do not introduce Prisma, PostgreSQL, Supabase, Firebase, Redis, or DB mirroring.
- Do not assume org-scoped SaaS routes such as `/orgs/$orgSlug`; this repo's current product model is mobile-first.
- Do not copy web-only Zustand, TanStack Form, or TanStack Query patterns unless the dependency and local convention already exist.
- Do not optimize from taste alone. Tie larger refactors to a real signal or an obviously unbounded path.
</anti_patterns>
