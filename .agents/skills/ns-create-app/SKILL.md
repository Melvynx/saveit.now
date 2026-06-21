---
name: ns-create-app
description: Turn an app idea into a NowStack Mobile build-ready plan. Use for create app, ns create-app, plan a new app, I have an app idea, or starting a product from scratch. Routes through ns-prd, ns-architecture, and ns-tasks.
---

# ns-create-app — App creation wizard

<objective>
Take someone from "I have an idea" to "a `.agents/plan/` spec I can start building from" in one guided flow. This skill **orchestrates** — it diagnoses, plans, confirms once, then invokes the existing planning skills in order. Never duplicate their content; invoke or read the target skill.

It is the product-creation counterpart to `/ns onboard` (which sets up the *machine + repo*). This sets up the *plan*: `.agents/plan/PRD.md` → `.agents/plan/ARCHITECTURE.md` → `.agents/plan/tasks/`.
</objective>

<orchestration>
1. **Diagnose** what already exists so finished steps are skipped: `.agents/plan/PRD.md`? `.agents/plan/ARCHITECTURE.md`? `.agents/plan/tasks/`? Is `site-config.ts` still "NowStack"/placeholder?
2. **Show the plan** — the steps below and what each writes. Get **one** confirmation for the whole flow (the discovery questions in step 1 still happen interactively).
3. **Execute in order**, skipping done steps. Carry the idea/context forward between steps so the user isn't re-asked what they already said.
4. **Report** after each step: written / skipped(already) / needs-input, and where things stand.
</orchestration>

## Steps

<step n="1" title="PRD">
Invoke **`ns-prd`** — interactive discovery → `.agents/plan/PRD.md` (vision, personas, onboarding/paywall flow, platforms, IAP/subscription monetization, MVP scope, metrics). If `.agents/plan/PRD.md` exists, offer to refine instead of overwrite. This is the only step that asks a lot of questions — keep it conversational.
</step>

<step n="2" title="Architecture">
Invoke **`ns-architecture`** — read `.agents/plan/PRD.md` + the real codebase, write `.agents/plan/ARCHITECTURE.md` mapped onto the fixed stack (Convex schema/indexes/functions, Expo Router screens, Better Auth, IAP/Stripe split, R2, ADRs, build order). No blank-slate stack design — extend what exists.
</step>

<step n="3" title="Tasks">
Invoke **`ns-tasks`** — read PRD + ARCHITECTURE, write `.agents/plan/tasks/*.md` + `.agents/plan/tasks/README.md` as autonomous 1–3h vertical slices with verification commands.
</step>

<step n="4" title="Apply config + hand off">
- If config-relevant facts emerged (title, slug, bundleId, description, price, IAP product ids, admin emails), offer **`/ns setup`** (`ns-init-project`) to write them into `site-config.ts` — confirm before mutating config.
- Summarize: the three docs written, the build order, and the first 1–2 tasks.
- Hand off to implementation: run tasks with the **`apex`** skill (structured) or **`oneshot`** (single small task). For the local run loop: `/ns setup-ios` then `/ns dev`.
</step>

<rules>
- Orchestrate, don't duplicate: invoke `ns-prd`, `ns-architecture`, `ns-tasks`, `ns-init-project` and follow their rules. This file only sequences them.
- One upfront confirmation for the flow; the PRD discovery questions still happen live. Skip any step whose output already exists (idempotent; re-running is safe — offer refine vs overwrite).
- Carry context forward — don't re-ask the idea at each step.
- Writing `site-config.ts` (step 4) is a real mutation → its own confirmation.
- Stay mobile-aware throughout: onboarding/paywall flows, IAP-vs-Stripe split, Convex-only backend, store scope.
- Don't start implementing here — this produces the plan; building is `apex`/`oneshot`.
</rules>

<verification>
- `.agents/plan/PRD.md`, `.agents/plan/ARCHITECTURE.md`, and `.agents/plan/tasks/` all present and consistent (every PRD must-have → architecture mapping → ≥1 task).
- End by pointing at the first task + the implementation skill (`apex`/`oneshot`) and the run loop (`/ns setup-ios` → `/ns dev`).
</verification>
