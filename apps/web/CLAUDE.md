### Directory Structure (apps/web)

- `app/` - Next.js App Router pages and API routes
- `src/lib/` - Core business logic, database operations, and integrations
- `src/components/` - Reusable UI components
- `src/features/` - Feature-specific components and logic
- `src/hooks/` - Custom React hooks

## PostHog Integration Guidelines

When working with analytics:

- Use enums/const objects for feature flag names (UPPERCASE_WITH_UNDERSCORE)
- Minimize feature flag usage across multiple locations
- Gate flag-dependent code with validation
- Maintain consistent naming conventions for events and properties

## Development Workflow

- Always run `pnpm ts` in the `apps/web` directory when modifying NextJS application code

## Commands

- Always ONLY run `pnpm test:ci` or `pnpm test:e2e:ci` in order to run them only in the terminal

## Important

- When you create `/api` routes ALWAYS do like @apps/web/app/api/bookmarks/route.ts and use the best @apps/web/src/lib/safe-route.ts files to do it.
- When you create `Server Function` please always look code in @apps/web/app/(layout)/exports/exports.action.ts and use @apps/web/src/lib/safe-action.ts to do it. Each action should be name `ACTION_NAME.action.ts`
- For fetch request, always use @apps/web/src/lib/up-fetch.ts
- For env variables, use @apps/web/src/lib/env.ts to typesafe env
- Always use `useMutation` or `useQuery` when you work with query (with `upfetch`)

## React Component

- Always use Shadcn/UI component
- Always use `cn` methods when you add classes (example : `cn("bg-red-500", { "bg-blue-500": isEnabled }))`)
- Avoid color like `bg-red-500` and use theme colors (in `globals.css`)
