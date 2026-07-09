FROM node:22-bookworm-slim AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable \
  && corepack prepare pnpm@10.4.1 --activate \
  && apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates \
  && apt-get clean

WORKDIR /app

FROM base AS deps

ENV CI="true"

COPY .npmrc .pnpmfile.cjs package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY scripts/postinstall-codegen.mjs ./scripts/postinstall-codegen.mjs
COPY apps/web/package.json ./apps/web/package.json
COPY packages/backend/package.json ./packages/backend/package.json
COPY packages/eslint-config/package.json ./packages/eslint-config/package.json
COPY packages/typescript-config/package.json ./packages/typescript-config/package.json
COPY packages/ui/package.json ./packages/ui/package.json
RUN pnpm install --frozen-lockfile

FROM deps AS build

ARG VITE_CONVEX_SITE_URL
ARG VITE_CONVEX_URL
ARG VITE_POSTHOG_HOST
ARG VITE_POSTHOG_KEY
ARG VITE_STRIPE_PUBLISHABLE_KEY

ENV AWS_ACCESS_KEY_ID="build-placeholder" \
  AWS_ENDPOINT="https://build-placeholder.example.com" \
  AWS_S3_BUCKET_NAME="build-placeholder" \
  AWS_SECRET_ACCESS_KEY="build-placeholder" \
  CI="true" \
  CLOUDFLARE_ACCOUNT_ID="build-placeholder" \
  CLOUDFLARE_API_TOKEN="build-placeholder" \
  HELP_EMAIL="help@saveit.now" \
  NODE_ENV="production" \
  R2_URL="https://build-placeholder.example.com" \
  RESEND_API_KEY="re_build_placeholder" \
  RESEND_EMAIL_FROM="Build <build@example.com>" \
  SKIP_CONVEX_DEPLOY="1" \
  STRIPE_COUPON_ID="build-placeholder" \
  UPSTASH_REDIS_REST_TOKEN="build-placeholder" \
  UPSTASH_REDIS_REST_URL="https://build-placeholder.example.com" \
  VERCEL_ENV="production" \
  VERCEL_PROJECT_PRODUCTION_URL="dokploy.saveit.now" \
  VERCEL_URL="dokploy.saveit.now" \
  VITE_CONVEX_SITE_URL="${VITE_CONVEX_SITE_URL}" \
  VITE_CONVEX_URL="${VITE_CONVEX_URL}" \
  VITE_POSTHOG_HOST="${VITE_POSTHOG_HOST}" \
  VITE_POSTHOG_KEY="${VITE_POSTHOG_KEY}" \
  VITE_STRIPE_PUBLISHABLE_KEY="${VITE_STRIPE_PUBLISHABLE_KEY}"

COPY . .
RUN NITRO_PRESET=node_server pnpm vercel-build

FROM base AS runner

ENV NODE_ENV="production"
WORKDIR /app

COPY --from=build /app/package.json ./package.json
COPY --from=build /app/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/web/package.json ./apps/web/package.json
COPY --from=build /app/apps/web/.output ./apps/web/.output
COPY --from=build /app/packages ./packages

WORKDIR /app/apps/web
EXPOSE 3000

CMD ["node", ".output/server/index.mjs"]
