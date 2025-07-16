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
