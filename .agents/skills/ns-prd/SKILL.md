---
name: ns-prd
description: Create a lean, mobile-aware Product Requirements Document for a NowStack Mobile app through interactive discovery, then save it to .agents/plan/PRD.md. Use for "write a PRD", "ns prd", "define the product", "plan my app", or as the first planning step before ns-architecture and ns-tasks. Mobile-flavored — personas, onboarding/paywall flow, platforms (iOS/Android/web), IAP vs subscription monetization, store scope. Feeds ns-init-project (site-config) and the rest of the planning pipeline.
---

# ns-prd — Mobile Product Requirements Document

<objective>
Produce a focused PRD for a NowStack Mobile MVP through conversation, then write **`.agents/plan/PRD.md`**. This is the FOUNDATION of the planning pipeline: **PRD → `/ns architecture` → `/ns tasks`**, and it also feeds `/ns setup` (`ns-init-project`) which turns the brief into `site-config.ts`.

Keep it lean (2–3 pages). Mobile-specific from the start: this is an app with an **onboarding flow, a paywall, native payments, and store constraints** — not a generic web SaaS. If a `.agents/plan/PRD.md` already exists, read it and offer to refine rather than overwrite.
</objective>

<process>
## Phase 1 — Discovery (ask 2–3 questions at a time, never the whole list at once)
Do NOT write anything until all six areas are covered. Dig past vague answers; push for specifics.

1. **Problem & vision** — what problem, for whom, why now, what makes it different, what does success look like.
2. **Target users (1–3 personas)** — role/context, pain points, motivation to install, what makes them churn or delete the app.
3. **Core loop & features** — the ONE thing the app must do, the 2–4 must-haves that support it, the nice-to-haves. What's the daily/weekly habit?
4. **Mobile shape** — platforms (iOS / Android / web `/app`?), is it offline-capable, does it need push, camera/media, or just content + sync. What does the **onboarding** teach and what's the activation moment.
5. **Monetization** — free / one-time IAP / subscription? Price point. Remember the boilerplate's split: **Apple IAP on iOS, Stripe on Android/web**. What's gated behind the **paywall** vs free.
6. **Success metrics & scope** — measurable signals (activation, D7 retention, paywall conversion, not "engagement"), and an explicit **NOT building in v1** list.

## Phase 2 — Verify completeness
Confirm before writing: core problem + a real user; 1–3 concrete personas; THE critical feature + 2–4 must-haves; platform + monetization decided; specific metrics; explicit out-of-scope. If anything is missing, ask more — do not generate a PRD with gaps.

## Phase 3 — Generate `.agents/plan/PRD.md`
Use the template below. Every feature needs Description / User value / Success metric. Capture the config-relevant facts (title, one-line description, platforms, price + IAP product intent) explicitly so `ns-init-project` can lift them into `site-config.ts`.

## Phase 4 — Save + next steps
Write `.agents/plan/PRD.md`. Then point at: **`/ns architecture`** (design schema + screens on this stack) → `/ns tasks` (implementable slices) → `/ns setup` (apply the brief to `site-config.ts`).
</process>

<output_template>
```markdown
# Product Requirements Document: [App Name]

## Product Vision
**Problem** — [2–3 sentences]
**Solution** — [2–3 sentences]
**Why a mobile app** — [why native/Expo vs web]

## Platforms & Monetization
- **Ships on**: iOS / Android / web `/app` (pick)
- **Model**: free | one-time IAP | subscription
- **Price**: [display price] · **IAP/products**: [intended product ids]
- **Paywall line**: [what is gated vs free]

## Target Users
### Primary Persona: [Name]
- **Context**: [role / situation] · **Pain points**: […] · **Motivation to install**: […] · **Churn trigger**: […]
### Secondary Persona: [Name] (if any)

## Core Loop
[The habit: what the user does, how often, and the value each time.]

## Core Features (MVP)
### Must-Have
#### 1. [Feature] — **Description** / **User value** / **Success metric**
#### 2. …  #### 3. …
### Should-Have (post-MVP)
- […]

## Key Flows
### Onboarding → activation
1. … 2. … 3. [activation moment]
### Primary journey
1. … 2. … 3. [outcome]
### Paywall
[When it triggers, what it offers.]

## Out of Scope (v1)
- […]  (explicit boundaries)

## Success Metrics
- **Activation**: [target] · **Retention (D7)**: [target] · **Paywall conversion**: [target]

## Open Questions
- […]
```
</output_template>

<constraints>
- Max 3–5 must-have features; if the user lists 10, help them cut to the core loop.
- Push for measurable metrics (activation %, D7, conversion) — reject "increase engagement".
- Conversational, not an interrogation; adapt to their domain.
- Mobile reality always present: onboarding, paywall, IAP-vs-Stripe split, store scope.
- 2–3 pages, not a 20-page spec. Don't invent legal/company/pricing the user hasn't given.
- Write to `.agents/plan/PRD.md` (agent planning artifacts live under `.agents/plan/`, separate from the boilerplate's `docs/`) — not the repo root.
</constraints>

<verification>
- All six discovery areas answered; 1–3 concrete personas; 3–5 must-haves each with a success metric; platform + monetization decided; explicit out-of-scope.
- `.agents/plan/PRD.md` written. Next: `/ns architecture`.
</verification>
