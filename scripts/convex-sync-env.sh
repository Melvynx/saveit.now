#!/usr/bin/env bash
# Syncs SaveIt backend secrets from local .env/.env.local into the selected
# Convex deployment (only sets keys that are MISSING on the deployment).
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$script_dir/worktree-context.sh"

worktree_path="$(resolve_worktree_path "$script_dir")"
cd "$worktree_path"

convex_env_list="$(convex env list)"

convex_has_env_key() {
  printf '%s\n' "$convex_env_list" | grep -Eq "^${1}="
}

read_env_value() {
  local key="$1" file line value
  for file in .env.local .env apps/web/.env; do
    [ -f "$file" ] || continue
    line="$(grep -E "^${key}=" "$file" | tail -n 1 || true)"
    [ -z "$line" ] && continue
    value="${line#*=}"
    value="${value%$'\r'}"
    if [[ "$value" == \"*\" && "$value" == *\" ]]; then
      value="${value:1:${#value}-2}"
    elif [[ "$value" == \'*\' && "$value" == *\' ]]; then
      value="${value:1:${#value}-2}"
    fi
    printf '%s\n' "$value"
    return 0
  done
  return 1
}

sync_missing_env_value() {
  local key="$1" value
  if value="$(read_env_value "$key")" && [ -n "$value" ]; then
    if convex_has_env_key "$key"; then
      return 0
    fi
    printf '%s\n' "$value" | convex env set "$key" >/dev/null
    echo "[convex-env] set missing $key"
  fi
}

# Auth
sync_missing_env_value BETTER_AUTH_SECRET
sync_missing_env_value BETTER_AUTH_COOKIE_PREFIX
sync_missing_env_value SITE_URL
sync_missing_env_value BETTER_AUTH_TRUSTED_ORIGINS
sync_missing_env_value APPSTORE_TEST_EMAIL
sync_missing_env_value EXTENSION_ALLOWED_ORIGINS
# OAuth providers
sync_missing_env_value GITHUB_CLIENT_ID
sync_missing_env_value GITHUB_CLIENT_SECRET
sync_missing_env_value GOOGLE_CLIENT_ID
sync_missing_env_value GOOGLE_CLIENT_SECRET
sync_missing_env_value APPLE_CLIENT_ID
sync_missing_env_value APPLE_CLIENT_SECRET
sync_missing_env_value APPLE_APP_BUNDLE_IDENTIFIER
# AI
sync_missing_env_value GOOGLE_GENERATIVE_AI_API_KEY
sync_missing_env_value OPENAI_API_KEY
# Stripe
sync_missing_env_value STRIPE_SECRET_KEY
sync_missing_env_value STRIPE_WEBHOOK_SECRET
sync_missing_env_value STRIPE_PRO_MONTHLY_PRICE_ID
sync_missing_env_value STRIPE_PRO_YEARLY_PRICE_ID
sync_missing_env_value STRIPE_COUPON_ID
# Email (Resend)
sync_missing_env_value RESEND_API_KEY
sync_missing_env_value RESEND_EMAIL_FROM
sync_missing_env_value HELP_EMAIL
# Email marketing (Lumail)
sync_missing_env_value LUMAIL_API_KEY
# Storage (Cloudflare R2 via S3 SDK)
sync_missing_env_value AWS_ACCESS_KEY_ID
sync_missing_env_value AWS_SECRET_ACCESS_KEY
sync_missing_env_value AWS_S3_BUCKET_NAME
sync_missing_env_value AWS_ENDPOINT
sync_missing_env_value R2_URL
# Cloudflare Browser Rendering (screenshots / PDF)
sync_missing_env_value CLOUDFLARE_API_TOKEN
sync_missing_env_value CLOUDFLARE_ACCOUNT_ID
