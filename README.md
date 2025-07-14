# SaveIt.now

A modern bookmark management SaaS application built with TypeScript, Next.js, and Prisma.

## Architecture

This is a TypeScript monorepo using pnpm workspaces and Turbo for task orchestration.

### Applications

- **apps/web** - Next.js 15 web application (main SaaS product)
- **apps/chrome-extension** - Chrome browser extension
- **apps/firefox-extension** - Firefox browser extension
- **apps/worker** - Cloudflare Worker for background processing

### Shared Packages

- **packages/database** - Prisma database client and types
- **packages/ui** - Shared UI components using shadcn/ui
- **packages/eslint-config** - Shared ESLint configuration
- **packages/typescript-config** - Shared TypeScript configuration

## Technology Stack

- **Frontend**: Next.js 15, TypeScript, shadcn/ui
- **Authentication**: Better Auth with GitHub/Google OAuth, magic links, email OTP
- **Database**: PostgreSQL with Prisma ORM
- **Payments**: Stripe integration for subscriptions
- **Background Jobs**: Inngest for bookmark processing and emails
- **File Storage**: AWS S3 for screenshots and media
- **Email**: Resend for transactional emails
- **Analytics**: PostHog
- **AI Features**: OpenAI and Google Gemini integration

## Development

### Prerequisites

- Node.js 18+
- pnpm
- PostgreSQL database

### Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   pnpm install
   ```
3. Set up environment variables (see CLAUDE.md for full list)
4. Run database migrations:
   ```bash
   pnpm db:generate && pnpm db:migrate
   ```

### Development Commands

```bash
# Start all development servers
pnpm dev

# Build all packages and applications
pnpm build

# Run linting across all packages
pnpm lint

# Format code using Prettier
pnpm format
```

### Web Application

```bash
# Start Next.js dev server
pnpm dev

# Run TypeScript checks
pnpm ts

# Generate Better Auth schema
pnpm better-auth:generate
```

### Database

```bash
# Generate Prisma client
pnpm db:generate

# Run migrations (development)
pnpm db:migrate

# Deploy migrations (production)
pnpm db:deploy
```

## Using UI Components

Import components from the shared UI package:

```tsx
import { Button } from "@workspace/ui/components/button";
```

To add new shadcn/ui components:

```bash
pnpm dlx shadcn@latest add button -c apps/web
```
