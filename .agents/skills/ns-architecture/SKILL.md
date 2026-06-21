---
name: ns-architecture
description: Design NowStack Mobile architecture from .agents/plan/PRD.md and write .agents/plan/ARCHITECTURE.md. Use for ns architecture, schema and screen planning, or the planning step between ns-prd and ns-tasks.
---

# ns-architecture — Mobile technical architecture

<objective>
Turn `.agents/plan/PRD.md` into a concrete technical plan and write **`.agents/plan/ARCHITECTURE.md`**. Second step of the pipeline: PRD → **architecture** → `/ns tasks`.

Critical framing: **the stack is already decided** (read `CLAUDE.md` / `AGENTS.md`). You are NOT choosing a database or a framework — you are designing how the PRD's features map onto Convex + Expo + Better Auth + Apple IAP/Stripe + R2 + TanStack Start. The valuable output is the **data model, the Convex function surface, the screens, and the payment/auth/storage wiring** — grounded in the real files, not invented.
</objective>

<process>
## Phase 1 — Read the PRD and the real codebase
1. Read `.agents/plan/PRD.md` (require it; if missing → run `/ns prd` first).
2. Read the rules so the design respects them: `.agents/rules/convex.md`, `.agents/rules/mobile-app.md`, `.agents/rules/auth-payments-storage.md`, and `convex/_generated/ai/guidelines.md`.
3. Read what already exists so you EXTEND, not duplicate: `convex/schema.ts`, `convex/functions.ts` (the `authQuery`/`authMutation`/`adminQuery`/`adminMutation` builders), the `convex/users|admin|payments|storage/` domains, `mobile-app/app/` route groups (`(app)`, `(auth)`, `(flow)`, `(tabs)`, onboarding, paywall), and `site-config.ts`.

## Phase 2 — Design, challenging every decision
For each must-have feature in the PRD, decide:
- **Data model** — new Convex tables + the **indexes** each query needs (`.withIndex`, pagination — never unbounded `.collect()`/`.filter()`; counters for real counts). What hangs off the `users` row.
- **Function surface** — the public/internal Convex queries/mutations/actions, each built with the project builders and derived server-side identity (never a client `userId`). Name them and state args/returns at a high level.
- **Screens** — which Expo Router screens/route groups (mind the group-segment paths, e.g. `/(flow)/paywall`), what's a tab vs a stack screen, and what the web `/app` surface shows (if any).
- **Entitlement & gating** — what's behind the paywall; record the entitlement on the **user** level and apply derived grants idempotently (the auth-payments-storage rule: a validated purchase must never fail because a derived grant threw). IAP on iOS, Stripe on Android/web.
- **Storage** — any R2 uploads (Convex storage helpers, signed URLs) and where.
- **Auth/admin** — which surfaces are signed-in vs admin-only; allowlist in `site-config.ts` + Convex check.

## Phase 3 — Write `.agents/plan/ARCHITECTURE.md`
Use the template. Keep it real: cite actual paths and builders, include an ADR for each non-obvious choice, and a build-order. Don't restate the whole stack — only the deltas this product adds.

## Phase 4 — Next step
Point at **`/ns tasks`** to slice this into implementable work, then `/ns setup` if config values (products, admin emails) changed.
</process>

<output_template>
```markdown
# Technical Architecture: [App Name]

## Overview
[2–3 sentences: how the PRD maps onto the stack. Link .agents/plan/PRD.md.]

## Data Model (Convex)
| Table | Fields (key) | Indexes | Notes |
|---|---|---|---|
| `xyz` | … | `by_user`, … | hangs off users / counters / pagination |
[Reference: extends `convex/schema.ts`. Indexes for every queried field.]

## Convex Function Surface
| Function | Type (builder) | Args → Returns | Auth |
|---|---|---|---|
| `xyz.list` | `authQuery` | … | user-scoped |
| `admin.…` | `adminQuery` | … | admin-only |
[Identity derived server-side. Validators on every arg.]

## Screens (Expo Router)
| Screen | Path (with group) | Type | Notes |
|---|---|---|---|
| … | `/(tabs)/…` / `/(flow)/…` | tab / stack / modal | |
[Web `/app` surface, if any.]

## Payments & Entitlements
- Gated: [features] · iOS: Apple IAP · Android/web: Stripe
- Entitlement recorded on: **user** · derived grants: [idempotent, try/catch]

## Storage / Auth
- R2: [what, where] · Signed-in surfaces: […] · Admin-only: […]

## Architecture Decision Records
### ADR-001: [decision] — context / choice / why / trade-offs
### ADR-002: …

## Build Order
1. **Foundation** — schema + indexes, core Convex functions
2. **Core features** — screens + wiring
3. **Monetization & polish** — paywall, entitlements, analytics
```
</output_template>

<constraints>
- The stack is fixed — Convex only (no Prisma/Supabase/Firebase), Expo Router, Better Auth, IAP/Stripe split, R2. Don't propose alternatives.
- Ground every table/function/screen in real paths and the project builders; extend existing domains rather than inventing parallel ones.
- Enforce the Convex rules: indexes for queried fields, no unbounded `.collect()`/`.filter()`, counters for counts, validators on args, server-derived identity.
- Honor the purchase-safety rule: user-level entitlement first, derived grants idempotent in try/catch.
- Require `.agents/plan/PRD.md`. Write to `.agents/plan/ARCHITECTURE.md`.
</constraints>

<verification>
- Every PRD must-have feature has a data model + function + screen mapping.
- Indexes named for each query; no scan-the-table patterns; entitlements user-level.
- `.agents/plan/ARCHITECTURE.md` written. Next: `/ns tasks`.
</verification>
