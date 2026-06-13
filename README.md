# SaveIt.now

A modern bookmark management SaaS application built with TypeScript, TanStack Start, and Convex.

## Architecture

This is a TypeScript monorepo using pnpm workspaces and Turbo for task orchestration.

### Applications

- **apps/web** - TanStack Start web application (main SaaS product)
- **apps/chrome-extension** - Chrome browser extension
- **apps/firefox-extension** - Firefox browser extension
- **apps/worker** - Cloudflare Worker for background processing

### Shared Packages

- **packages/backend** - Convex backend functions, schema, and auth
- **packages/ui** - Shared UI components using shadcn/ui
- **packages/eslint-config** - Shared ESLint configuration
- **packages/typescript-config** - Shared TypeScript configuration

## Technology Stack

- **Frontend**: TanStack Start, TypeScript, shadcn/ui
- **Authentication**: Better Auth with GitHub/Google OAuth, magic links, email OTP
- **Backend**: Convex for data, auth integration, and background work
- **Payments**: Stripe integration for subscriptions
- **File Storage**: AWS S3 for screenshots and media
- **Email**: Resend for transactional emails
- **Analytics**: PostHog
- **AI Features**: OpenAI and Google Gemini integration

## Development

### Prerequisites

- Node.js 18+
- pnpm
- Convex deployment

### Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   pnpm install
   ```
3. Set up environment variables (see CLAUDE.md for full list)
4. Start the Convex backend:
   ```bash
   pnpm convex:dev
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
# Start the TanStack Start dev server
pnpm dev

# Run TypeScript checks
pnpm ts

# Start Convex backend
pnpm convex:dev
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
