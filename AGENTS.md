# AGENTS.md

## Build/Lint/Test Commands

- `pnpm dev` - Start all development servers using Turbo
- `pnpm build` - Build all packages and applications  
- `pnpm lint` - Run linting across all packages
- `pnpm format` - Format code using Prettier
- `cd apps/web && pnpm ts` - Run TypeScript check for web app
- `cd apps/web && pnpm lint` - Run Next.js linting for web app
- `cd packages/database && pnpm db:generate` - Generate Prisma client
- `cd packages/database && pnpm db:migrate` - Run database migrations

## Code Style Guidelines

- Use TypeScript for all code; prefer types over interfaces
- Avoid default exports unless required by framework (Next.js pages)
- Use kebab-case for files, PascalCase for components, camelCase for variables
- Use Shadcn UI and Tailwind CSS for styling with mobile-first approach
- Prefer `flex gap-n` over `space-y-n`, use `bg-white/50` over `bg-white bg-opacity-50`
- Minimize `use client`, favor React Server Components (RSC)
- Use descriptive variable names with auxiliary verbs (`isLoading`, `hasError`)
- Structure files: exported component, subcomponents, helpers, static content, types
- Always use `pnpm` for package management
- Write code in English, no comments unless explicitly requested