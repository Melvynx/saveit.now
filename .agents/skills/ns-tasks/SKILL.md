---
name: ns-tasks
description: Slice a NowStack Mobile app's .agents/plan/PRD.md + .agents/plan/ARCHITECTURE.md into well-scoped, implementable task files under .agents/plan/tasks/, each an autonomous 1–3h vertical slice (Convex schema/function → Expo screen → wiring) with success criteria, dependencies, and verification commands. Use for "create tasks", "ns tasks", "break this into tickets", or as the third planning step after ns-prd and ns-architecture. Both docs must exist first.
---

# ns-tasks — Mobile implementation tasks

<objective>
Turn `.agents/plan/PRD.md` + `.agents/plan/ARCHITECTURE.md` into a set of implementable task files under **`.agents/plan/tasks/`** plus a `.agents/plan/tasks/README.md` overview. Final step of the pipeline: PRD → architecture → **tasks**.

Each task is a **vertical slice** an agent can finish autonomously in ~1–3h with a clear deliverable and a way to verify it. Mobile slices usually run **schema + index → Convex function (built with the project builders) → Expo screen/route → wire-up → verify**.
</objective>

<process>
## Phase 1 — Read specs + the codebase
1. Read `.agents/plan/PRD.md` and `.agents/plan/ARCHITECTURE.md` (require both; if missing → `/ns prd` / `/ns architecture` first).
2. Skim the real structure so tasks cite real paths: `convex/` domains + `convex/functions.ts` builders, `mobile-app/app/` route groups, `mobile-app/components/ui/`, `site-config.ts`, and the `.agents/rules/` that match (convex, mobile-app, auth-payments-storage, verification).

## Phase 2 — Decompose into slices + dependency graph
- Cut the architecture into vertical slices, not horizontal layers — a task should deliver a usable thing end-to-end (data → backend → screen), not "all the schema".
- Order by dependency: schema/foundation → core Convex functions → screens → monetization/entitlements → polish. Note which tasks block which.
- Right-size: 1–3h each. Split anything bigger; merge trivial ones.

## Phase 3 — Verify before writing
Confirm: every PRD must-have maps to ≥1 task; every architecture table/function/screen is covered; dependencies are acyclic; each task has a concrete verification step. If gaps, analyze more — don't emit tasks with holes.

## Phase 4 — Write the files
1. Create `.agents/plan/tasks/` (numbered: `01-…md`, `02-…md`).
2. One file per task using the template below.
3. Write `.agents/plan/tasks/README.md`: project summary, execution guidelines (read the matching `.agents/rules/` first, follow `convex/_generated/ai/guidelines.md`), and the phased checklist with dependencies.
</process>

<task_template>
```markdown
# Task [NN]: [Action-oriented title]

## Context
[1–2 sentences linking back to the PRD feature / ARCHITECTURE section this delivers.]

## Scope
[The specific, end-to-end deliverable for this slice.]

## Implementation
**Files to create/modify**
- `convex/<domain>/<file>.ts` — [function(s), built with `authQuery`/`authMutation`/`adminQuery`…]
- `convex/schema.ts` — [table + indexes, if any]
- `mobile-app/app/(<group>)/<screen>.tsx` — [screen]
- [web `web-app/app/routes/…` if the `/app` surface is touched]

**Key functionality**
- […] (server-derived identity, validators on args, `.withIndex` not `.filter`)

**Patterns / rules to follow**
- `.agents/rules/convex.md`, `.agents/rules/mobile-app.md`, `.agents/rules/auth-payments-storage.md` as applicable
- Route-group paths (e.g. `/(flow)/paywall`); IAP iOS / Stripe Android-web; entitlement user-level + idempotent grants

## Success Criteria
- [ ] [Observable outcome 1]
- [ ] [Observable outcome 2]

## Verification
- `npx convex dev --once` (Convex changes)
- `cd mobile-app && npx tsc --noEmit` (+ `npm run lint` if shared UI)
- [Simulator/manual step for nav/auth/paywall/native behavior]

## Dependencies
- Blocked by: Task [N] — [name] (or "none")
- Blocks: Task [X]

**Phase**: Foundation / Core / Monetization / Polish
```
</task_template>

<constraints>
- Require both `.agents/plan/PRD.md` and `.agents/plan/ARCHITECTURE.md`.
- Vertical slices, not layer-dumps. Each task independently verifiable.
- Tasks must reference REAL paths, the project builders, and the matching rule files — and carry the repo's verification commands, not generic "run tests".
- Respect Convex rules (indexes, no unbounded scans, validators, server identity) and the purchase-safety rule in every relevant task.
- Write under `.agents/plan/tasks/` with a `README.md` index. Don't dump tasks into the repo root.
</constraints>

<verification>
- Every PRD must-have → ≥1 task; every architecture element covered; dependency graph acyclic.
- Each task has files, success criteria, and a real verification command.
- `.agents/plan/tasks/*.md` + `.agents/plan/tasks/README.md` written. Ready to implement (e.g. via the `apex` or `oneshot` skills).
</verification>
