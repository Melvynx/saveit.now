---
name: ns-add-documentation
description: Add or update NowStack Mobile docs in docs/. Use when documenting architecture, release workflows, Convex/web/mobile patterns, setup, APIs, or tooling — or via `/ns docs`.
---

# Add Documentation — NowStack Mobile

<objective>
Write or update repository docs in `docs/`, in this repo's house style: plain Markdown, grounded in real files and commands. This is NOT the public MDX docs tree from NowStack SaaS — no `/docs/[slug]` route, no MDX components.
</objective>

<workflow>
1. **See what already exists** (never assume — the doc set changes):
   ```bash
   ls docs/ docs/templates/
   ```
   Update an existing doc if one already covers the topic; only create a new file when nothing fits.

2. **Scope it** before writing. Answer:
   - Who reads this — agent, developer, release operator, or support?
   - Which surface — `convex/`, `web-app/`, `mobile-app/`, store release, or shared `site-config.ts`?
   - What should the reader *do differently* after reading it?
   - Which command or file proves the guidance is still current?

3. **Create from the template** so frontmatter and structure stay consistent:
   ```bash
   .agents/skills/ns-add-documentation/scripts/create-doc.sh <filename> "<title>" "<description>"
   # e.g. create-doc.sh web-app-routing "Web App Routing" "TanStack Start route conventions"
   ```
   Writes `docs/<filename>.md` from `templates/doc-template.md`.

4. **Fill it in** — replace every `TODO` with real paths, exact steps, and real verification commands.

5. **Make it discoverable** — link the new doc where a reader would look for it (a sibling doc, or the relevant `.agents/rules/*.md` / `AGENTS.md` entry). An unlinked doc is a doc nobody finds.

6. **Verify** the commands you wrote actually run (see below), then report the path.
</workflow>

<structure>
```md
---
title: "Feature Or Workflow"
description: "One sentence explaining the doc"
---

# Feature Or Workflow

## Purpose
What this solves and when it applies.

## Relevant Files
- `path/to/real/file`

## Workflow
1. Exact step.

## Verification
Commands or manual checks that prove it works.

## Notes
Caveats, secrets to keep out of git, release constraints.
```
Deeper conventions: [references/documentation-format.md](references/documentation-format.md).
</structure>

<rules>
- Ground every claim in a real repo file or command — no invented paths, routes, or flags.
- Commands must match `.agents/rules/development-commands.md`.
- Convex docs: state that agents must read `convex/_generated/ai/guidelines.md` before editing `convex/`.
- Cross-surface product/URL/auth/payment facts come from `site-config.ts`.
- Release docs: keep `asc`/`gpc`/screenshot conventions, and keep iOS/Android/store secrets out of git.
- Don't reintroduce the SaaS web-docs tree: no MDX-only components, no `/docs/[slug]`, no NowStack SaaS org routes.
</rules>

<verification>
Run only the checks matching the doc's surface:

```bash
npx convex dev --once               # Convex docs compile against the schema
cd web-app && npm run typecheck     # web docs
cd web-app && npm run build
cd mobile-app && npx tsc --noEmit   # mobile docs
cd mobile-app && npm run lint
cd mobile-app && npm run screenshots:store   # store/screenshot docs
```
</verification>

<success_criteria>
- The doc lives in `docs/`, references only real repo paths, and its commands run.
- It's linked from somewhere a reader will actually look.
- No stale public-docs-tree, MDX-only, `/docs/[slug]`, or NowStack SaaS assumptions remain.
</success_criteria>
