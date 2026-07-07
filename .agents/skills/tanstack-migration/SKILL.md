---
name: tanstack-migration
description: Use when migrating SaveIt.now from the old Next.js app directory to TanStack Start, restoring route parity, UI parity, API parity, and verification without leaving Next.js runtime code.
---

# TanStack Migration

## Objective

Finish the SaveIt.now migration so `apps/web` is fully TanStack Start/Vite, with every previous route from `HEAD:apps/web/app` migrated to `apps/web/src/routes` or equivalent `src` modules.

## Hard Rules

- Do not restore `apps/web/app`, `.next`, `next.config.*`, `next-env.d.ts`, or any Next.js runtime.
- Do not add `next`, `next/link`, `next/image`, `next/navigation`, `next/server`, `next/cache`, `next-mdx-remote-client/rsc`, `next-themes`, `next-safe-action`, or `next-zod-route`.
- Do not approximate the UI. Read the old file from git history and preserve the same layout, text, components, and behavior.
- Do not leave broken footer/header links. If a visible route links to a page, that page must exist or the link must be intentionally replaced with an existing equivalent.
- Do not use em dash characters in code, copy, comments, or reports. Use a regular hyphen or rewrite the sentence.
- Do not edit unrelated files outside the assigned scope unless typecheck proves the shared file is required.
- Never revert user changes or broad migration work already present in the worktree.

## Required Inventory

Use the old Next app as source of truth:

```bash
git ls-tree -r --name-only HEAD -- apps/web/app | rg 'page\.(tsx|ts)$'
git ls-tree -r --name-only HEAD -- apps/web/app/api | rg 'route\.(tsx|ts)$'
```

Use current TanStack routes as destination:

```bash
rg --files apps/web/src/routes
```

## Migration Patterns

- `apps/web/app/(landing)/page.tsx` and `apps/web/app/(landing)/landing/page.tsx` become `apps/web/src/routes/index.tsx`.
- `apps/web/app/(landing)/pricing/page.tsx` becomes `apps/web/src/routes/pricing.tsx`.
- `apps/web/app/(landing)/tools/page.tsx` becomes `apps/web/src/routes/tools.tsx`.
- `apps/web/app/(landing)/tools/<name>/page.tsx` becomes `apps/web/src/routes/tools.<name>.tsx`, using dot route syntax.
- Dynamic routes use TanStack file params, for example `posts.$slug.tsx`, `docs.$slug.tsx`, `u.$slug.tsx`, `p.$bookmarkId.tsx`.
- API routes use TanStack server route files, for example `api.bookmarks.ts`, `api.bookmarks.$bookmarkId.ts`.
- Server-only data fetching belongs in route loaders or server route handlers, not in client components.
- Convert `Link` from `next/link` to plain `<a>` or TanStack `Link` when route params/search preservation is required.
- Convert `next/image` to `<img>` with equivalent sizing classes and alt text.
- Convert `notFound()` to a rendered not-found state or a thrown router not-found when the local pattern exists.
- Convert `redirect()` to TanStack redirect helpers in loaders or client navigation in components.
- Convert `NextRequest` and `NextResponse` to standard `Request` and `Response.json`.
- Server-only data access should use Convex functions or server helpers; do not introduce browser-only modules into server routes.

## Verification

Every migration slice must run:

```bash
cd apps/web
pnpm ts
pnpm lint
pnpm build
```

Run strict no-Next scans from repo root:

```bash
rg -n "NEXT_PUBLIC_|Next\.js|Nextjs|nextjs|next js|next/|@next|next-|better-auth/next-js|next-themes|next-zod-route|next-safe-action|NextRequest|NextResponse|from \"next|from 'next" . --glob '!node_modules/**' --glob '!.git/**' --glob '!apps/web/.output/**' --glob '!apps/web/dist/**' | rg -v "eslint-disable-next-line"
find apps/web -maxdepth 2 \( -name 'next.config.*' -o -name 'next-env.d.ts' -o -name '.next' -o -name 'app' \) -print
pnpm --filter web why next
```

Browser verify every migrated visible route in the assigned scope:

- route returns HTTP 200 or intentionally redirects when authenticated.
- page title/main heading and visible sections match the old route.
- browser console has no React runtime errors.
- linked actions still call migrated APIs.

## Report Format

Return:

- migrated routes and files
- API routes added or fixed
- verification commands and results
- browser routes checked
- remaining route gaps in the assigned scope
