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
- `pnpm ts` - Run TypeScript formatting
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

## Environment Configuration

The application requires extensive environment variables (35+ variables) for various integrations. Check turbo.json for the complete list of required environment variables for builds.

## Deployment and Logs

- To get the latest deployment logs, use `flyctl logs` command for the specific app
- Vercel CLI deployment commands:
  - `vercel` - Deploy the current project
  - `vercel --prod` - Deploy to production
  - `vercel logs` - View latest deployment logs
  - `vercel inspect` - Get detailed deployment information and verify everything is working correctly

## Workflow

- Always run `pnpm ts` AND `pnpm lint` in the folder `app/web` to verify typescript working after a task

## Commands usage

IMPORTANT - When the users write `#<some-name>` you SHOULD always try to find a commands inside the folder `.claude/commands` that match `<some-name>` then read the file and strictly follow the instructions. You can also search in `~/.claude/commands` for user globals commands.

You SHOULD STRICTLY follow the commands of the commands at any cost.

You SHOULD ALWAYS trigger the commands usage when the query start with `#`.
But you SHOULD NEVER do it if the query DOESN'T START with `#` !

## Agent usage

You can adopt a fan-out pattern where you spawn subagents to perform parallel isolated tasks, and then fan-in the results.

```
codex exec "something to do" -m gpt-5 -c model_reasoning_effort="high" --yolo
```
