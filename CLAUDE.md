# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Core Commands
- `pnpm dev` - Start all development servers using Turbo
- `pnpm build` - Build all packages and applications 
- `pnpm lint` - Run linting across all packages
- `pnpm format` - Format code using Prettier

### Web Application (apps/web)
- `pnpm dev` - Start Next.js dev server with Turbo pack
- `pnpm lint` - Run Next.js linting
- `pnpm lint:fix` - Fix linting issues automatically
- `pnpm typecheck` or `pnpm ts` - Type check without emitting files
- `pnpm inngest:dev` - Start Inngest development server
- `pnpm stripe:webhook` - Listen for Stripe webhooks locally
- `pnpm better-auth:generate` - Generate Better Auth schema

### Database (packages/database)
- `pnpm db:generate` - Generate Prisma client
- `pnpm db:migrate` - Run database migrations in development
- `pnpm db:deploy` - Deploy migrations to production

### Browser Extensions
Chrome and Firefox extensions are built separately with their own package.json files in `apps/chrome-extension/` and `apps/firefox-extension/`.

## Architecture Overview

This is a TypeScript monorepo using pnpm workspaces and Turbo for task orchestration. The project is a bookmark management SaaS application called "SaveIt.now".

### Key Applications
- **apps/web** - Next.js 15 web application (main SaaS product)
- **apps/chrome-extension** - Chrome browser extension
- **apps/firefox-extension** - Firefox browser extension  
- **apps/worker** - Cloudflare Worker for background processing

### Shared Packages
- **packages/database** - Prisma database client and types
- **packages/ui** - Shared UI components using shadcn/ui
- **packages/eslint-config** - Shared ESLint configuration
- **packages/typescript-config** - Shared TypeScript configuration

### Web Application Architecture

**Authentication**: Uses Better Auth with Prisma adapter, supporting GitHub/Google OAuth, magic links, and email OTP. Includes Stripe integration for subscriptions.

**Database**: PostgreSQL with Prisma ORM. Schema generation and migrations managed through packages/database.

**Background Jobs**: Inngest for processing bookmarks, sending emails, and handling webhooks.

**File Storage**: AWS S3 for bookmark screenshots and media files.

**Key Service Integrations**:
- Stripe for payments and subscriptions
- Resend for transactional emails
- PostHog for analytics
- OpenAI and Google Gemini for AI features
- Better Auth for authentication

### Directory Structure (apps/web)
- `app/` - Next.js App Router pages and API routes
- `src/lib/` - Core business logic, database operations, and integrations
- `src/components/` - Reusable UI components
- `src/features/` - Feature-specific components and logic
- `src/hooks/` - Custom React hooks

## Environment Configuration

The application requires extensive environment variables (35+ variables) for various integrations. Check turbo.json for the complete list of required environment variables for builds.

## Testing and Quality

Always run type checking with `pnpm typecheck` before committing changes. The monorepo uses shared ESLint and TypeScript configurations for consistency.

## PostHog Integration Guidelines

When working with analytics:
- Never hallucinate API keys - use environment variables
- Use enums/const objects for feature flag names (UPPERCASE_WITH_UNDERSCORE)
- Minimize feature flag usage across multiple locations
- Gate flag-dependent code with validation
- Maintain consistent naming conventions for events and properties

## Deployment and Logs

- To get the latest deployment logs, use `flyctl logs` command for the specific app
- Vercel CLI deployment commands:
  - `vercel` - Deploy the current project
  - `vercel --prod` - Deploy to production
  - `vercel logs` - View latest deployment logs
  - `vercel inspect` - Get detailed deployment information and verify everything is working correctly