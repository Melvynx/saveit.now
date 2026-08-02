# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Core Commands

- `pnpm dev` - Start all development servers using Turbo
- `pnpm build` - Build all packages and applications
- `pnpm lint` - Run linting across all packages
- `pnpm format` - Format code using Prettier

### Web Application (apps/web)

- `pnpm dev` - Start TanStack Start dev server
- `pnpm lint` - Run web linting
- `pnpm ts` - Run TypeScript formatting

### Backend (packages/backend)

- `pnpm dev` - Start Convex development server
- `pnpm deploy` - Deploy Convex functions and schema

### Browser Extensions

Chrome and Firefox extensions are built separately with their own package.json files in `apps/chrome-extension/` and `apps/firefox-extension/`.

## Architecture Overview

This is a TypeScript monorepo using pnpm workspaces and Turbo for task orchestration. The project is a bookmark management SaaS application called "SaveIt.now".

### Key Applications

- **apps/web** - TanStack Start web application (main SaaS product)
- **apps/chrome-extension** - Chrome browser extension
- **apps/firefox-extension** - Firefox browser extension
- **apps/worker** - Cloudflare Worker for background processing

### Shared Packages

- **packages/backend** - Convex backend functions, schema, and auth
- **packages/ui** - Shared UI components using shadcn/ui
- **packages/eslint-config** - Shared ESLint configuration
- **packages/typescript-config** - Shared TypeScript configuration

### Web Application Architecture

**Authentication**: Uses Better Auth with Convex, supporting GitHub/Google OAuth, magic links, and email OTP. Includes Stripe integration for subscriptions.

**Backend**: Convex stores application data and runs server functions. Schema and functions live in packages/backend.

**Background Jobs**: Convex workflows and scheduled functions process bookmarks and product lifecycle events. Lumail Workflow V2 owns marketing email automation.

**File Storage**: AWS S3 for bookmark screenshots and media files.

**Key Service Integrations**:

- Stripe for payments and subscriptions
- Resend for transactional emails
- Lumail for marketing subscribers, tags, campaigns, and Workflow V2 automations
- Self-hosted Umami for analytics
- OpenAI and Google Gemini for AI features
- Better Auth for authentication

## Environment Configuration

The application requires extensive environment variables (35+ variables) for various integrations. Check turbo.json for the complete list of required environment variables for builds.

## Deployment and Logs

Production (`saveit.now`) runs on the Dokploy host (`ssh dokploy`, Hetzner) as the
`saveit-dokploy-11gbp3` Swarm service, built from `apps/web/Dockerfile`. Auto-deploy is on:
every push to `main` rebuilds the image.

- **Convex deploys with the web app.** The build stage mounts a `CONVEX_DEPLOY_KEY` build
  secret (Dokploy → application → Build Secrets, passed as `--secret type=env,id=…`).
  `scripts/vercel-build.mjs` then runs `convex deploy` and injects the deployed URL as
  `VITE_CONVEX_URL`, so the bundle can never ship against a stale backend. Without the
  secret the build falls back to the `VITE_CONVEX_URL` build arg and skips the deploy.
- Manual backend deploy (when not going through a push): `npx convex deploy` from
  `packages/backend`.
- Container logs: `ssh dokploy 'docker service logs -f saveit-dokploy-11gbp3'`.
- Convex logs: `npx convex logs --prod`.

Vercel is legacy; `apps/web/vercel.json` and the `vercel-build` script name are kept because
the same script drives both paths.

## Workflow

- Always run `pnpm ts` AND `pnpm lint` in the folder `app/web` to verify typescript working after a task

## Verification Browser

- [.agents/rules/verification-browser.md](.agents/rules/verification-browser.md) - Browser verification must use the `dev-browser` skill with email OTP; read the OTP code from the Convex Better Auth `verification` table and check processing evidence in Convex data/logs.

<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read
`packages/backend/convex/_generated/ai/guidelines.md` first** for important guidelines on
how to correctly use Convex APIs and patterns. The file contains rules that
override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running
`npx convex ai-files install`.

<!-- convex-ai-end -->
