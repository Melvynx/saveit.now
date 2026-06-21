# Documentation Format

NowStack Mobile documentation lives in `docs/` as plain Markdown.

## File Naming

- Use kebab-case filenames.
- Use `.md`.
- Put templates or machine-readable examples under `docs/templates/`.

## Frontmatter

Keep frontmatter small:

```md
---
title: "Short Title"
description: "One sentence summary"
---
```

## Recommended Sections

- `Purpose`: when the doc applies and why it exists.
- `Relevant Files`: concrete repo paths.
- `Workflow`: exact steps, written for agents and developers.
- `Verification`: commands or manual checks.
- `Notes`: caveats, secrets, or release constraints.

## Repo-Specific Guidance

- Commands must match `.agents/rules/development-commands.md`.
- Convex docs must mention `convex/_generated/ai/guidelines.md` when edits touch `convex/`.
- Web docs should refer to `web-app/`.
- Mobile docs should refer to `mobile-app/`.
- Cross-surface configuration docs should refer to `site-config.ts`.
- Store-release docs should preserve the existing `asc`, `gpc`, and screenshot workflow conventions.

## Avoid

- Legacy public-docs-tree references from the web-only SaaS repo.
- MDX-only components or imports.
- Public `/docs/[slug]` route checks.
- NowStack SaaS org-route examples that do not exist in this repo.
