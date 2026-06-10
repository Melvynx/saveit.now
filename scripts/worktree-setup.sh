#!/usr/bin/env bash
# Per-worktree environment setup for SaveIt (Conductor / Codex / Cursor).
# Convex-based — NO Prisma/Postgres. Creates/selects an isolated Convex dev
# deployment, clones env + data from the source `dev` deployment, sets a
# per-worktree Better Auth cookie prefix, pushes schema + codegen.
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$script_dir/worktree-context.sh"

worktree_path="$(resolve_worktree_path "$script_dir")"
cd "$worktree_path"

source_tree="$(resolve_source_tree)"
ensure_source_tree_exists "$source_tree" "worktree-setup"
ensure_not_source_tree "$source_tree" "ALLOW_SOURCE_TREE_SETUP" "worktree-setup" "set up"

workspace_slug="$(slugify "$(resolve_workspace_name)")"
auth_cookie_prefix="$(resolve_worktree_auth_cookie_prefix "$workspace_slug")"
convex_deployment_mode="$(resolve_convex_deployment_mode)"
convex_target_deployment=""
convex_created_deployment=0

echo "[worktree-setup] setting up SaveIt worktree: $workspace_slug"

copy_local_env() {
  local env_path="$1"
  local source_path="$source_tree/$env_path"
  if [ -f "$source_path" ] && [ "$source_path" != "$PWD/$env_path" ]; then
    mkdir -p "$(dirname "$env_path")"
    cp "$source_path" "$env_path"
    echo "[worktree-setup] copied $env_path"
  fi
}

# App-side env (web client + mobile). Backend secrets live on Convex.
copy_local_env "apps/web/.env"
copy_local_env "apps/mobile/.env"
copy_local_env "apps/mobile/.env.development"

set_local_env_value() {
  local env_path="$1" key="$2" value="$3"
  mkdir -p "$(dirname "$env_path")"
  touch "$env_path"
  if grep -Eq "^${key}=" "$env_path"; then
    ENV_KEY="$key" ENV_VALUE="$value" perl -0pi -e 'my $key=$ENV{ENV_KEY}; my $value=$ENV{ENV_VALUE}; s/^\Q$key\E=.*/$key . "=" . $value/me' "$env_path"
  else
    printf '%s=%s\n' "$key" "$value" >> "$env_path"
  fi
}

# Web SSR auth (convexBetterAuthReactStart) reads BETTER_AUTH_COOKIE_PREFIX — keep it in sync.
set_local_env_value "apps/web/.env" "BETTER_AUTH_COOKIE_PREFIX" "$auth_cookie_prefix"
echo "[worktree-setup] using Better Auth cookie prefix: $auth_cookie_prefix"

echo "[worktree-setup] installing dependencies"
CONVEX_CODEGEN_SKIP=1 pnpm install

backend_dir="packages/backend"

configure_convex_local() {
  ( cd "$backend_dir"
    if [ -f ".env.local" ] && grep -q "^CONVEX_DEPLOYMENT=local" ".env.local"; then
      echo "[worktree-setup] local Convex deployment already selected"; return 0
    fi
    rm -f ".env.local"; trash_path ".convex"
    echo "[worktree-setup] creating isolated local Convex deployment"
    if pnpm exec convex deployment create local --select; then
      echo "[worktree-setup] local Convex deployment selected"; return 0
    fi
    pnpm exec convex dev --local --once )
}

configure_convex_cloud() {
  local ref; ref="$(resolve_convex_deployment_ref "$workspace_slug")"
  convex_target_deployment="$ref"
  copy_local_env "$backend_dir/.env.local"
  echo "[worktree-setup] creating/selecting Convex dev deployment: $ref"
  ( cd "$backend_dir"
    if pnpm exec convex deployment create "$ref" --type dev --select; then
      exit 10
    else
      pnpm exec convex deployment select "$ref"
    fi )
  [ $? -eq 10 ] && convex_created_deployment=1 || true
}

clone_convex_dev_env() {
  local target_deployment="$1" source_deployment
  source_deployment="$(resolve_convex_env_source)"
  [ -z "$target_deployment" ] && return 0
  [ "$source_deployment" = "$target_deployment" ] && return 0
  ( cd "$backend_dir"
    local env_file=".env-convex"
    trap 'rm -f "$env_file"' EXIT
    echo "[worktree-setup] cloning Convex env from $source_deployment -> $target_deployment"
    pnpm exec convex env list --deployment "$source_deployment" > "$env_file" || true
    [ -s "$env_file" ] || { echo "[worktree-setup] source has no env vars"; exit 0; }
    pnpm exec convex env set --deployment "$target_deployment" --from-file "$env_file" --force >/dev/null )
}

import_convex_dev_data() {
  local target_deployment="$1" source_deployment
  source_deployment="$(resolve_convex_import_source)"
  [ -z "$target_deployment" ] && return 0
  [ "$source_deployment" = "$target_deployment" ] && return 0
  if [ "$convex_created_deployment" != "1" ] && [ "${CONVEX_WORKTREE_RESET_DATA:-0}" != "1" ]; then
    echo "[worktree-setup] deployment already existed; skipping data import"; return 0
  fi
  local export_dir export_path
  export_dir="$(mktemp -d -t saveit-convex-export)"; export_path="$export_dir/snapshot.zip"
  ( cd "$backend_dir"
    echo "[worktree-setup] exporting Convex data from $source_deployment"
    pnpm exec convex export --deployment "$source_deployment" --include-file-storage --path "$export_path"
    echo "[worktree-setup] importing Convex data into $target_deployment"
    pnpm exec convex import "$export_path" --deployment "$target_deployment" --replace-all -y )
  trash_path "$export_dir"
}

set_convex_auth_cookie_prefix() {
  local target_deployment="$1"
  ( cd "$backend_dir"
    if [ -n "$target_deployment" ]; then
      pnpm exec convex env set --deployment "$target_deployment" BETTER_AUTH_COOKIE_PREFIX "$auth_cookie_prefix" >/dev/null
    else
      pnpm exec convex env set BETTER_AUTH_COOKIE_PREFIX "$auth_cookie_prefix" >/dev/null
    fi )
  echo "[worktree-setup] set Convex BETTER_AUTH_COOKIE_PREFIX=$auth_cookie_prefix"
}

case "$convex_deployment_mode" in
  local)    configure_convex_local ;;
  cloud)    configure_convex_cloud ;;
  existing) copy_local_env "$backend_dir/.env.local"; echo "[worktree-setup] using existing Convex .env.local" ;;
  *)        echo "[worktree-setup] invalid CONVEX_WORKTREE_DEPLOYMENT_MODE (local|cloud|existing)" >&2; exit 1 ;;
esac

if [ "$convex_deployment_mode" = "cloud" ]; then
  clone_convex_dev_env "$convex_target_deployment"
  set_convex_auth_cookie_prefix "$convex_target_deployment"
  "$script_dir/convex-sync-env.sh"
  echo "[worktree-setup] pushing Convex schema and functions"
  ( cd "$backend_dir" && pnpm exec convex dev --once )
  import_convex_dev_data "$convex_target_deployment"
else
  set_convex_auth_cookie_prefix "$convex_target_deployment"
fi

echo "[worktree-setup] generating Convex client"
( cd "$backend_dir" && pnpm exec convex codegen )

echo "[worktree-setup] setup complete"
