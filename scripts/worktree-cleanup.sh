#!/usr/bin/env bash
# Per-worktree teardown for SaveIt. Removes the worktree's Convex dev deployment
# env vars (cloud mode) and local env files. Convex-based — no Postgres dropdb.
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$script_dir/worktree-context.sh"

worktree_path="$(resolve_worktree_path "$script_dir")"
cd "$worktree_path"

source_tree="$(resolve_source_tree)"
ensure_not_source_tree "$source_tree" "ALLOW_SOURCE_TREE_CLEANUP" "worktree-cleanup" "clean"

backend_dir="packages/backend"

cleanup_convex_env_vars() {
  [ "$(resolve_convex_deployment_mode)" = "cloud" ] || return 0
  [ "${CONVEX_WORKTREE_KEEP_CONVEX_ENV:-0}" = "1" ] && { echo "[worktree-cleanup] keeping Convex env vars"; return 0; }

  local workspace_slug target_deployment
  workspace_slug="$(slugify "$(resolve_workspace_name)")"
  target_deployment="$(resolve_convex_deployment_ref "$workspace_slug")"

  case "$target_deployment" in
    dev/*) ;;
    *) echo "[worktree-cleanup] refusing to clean non-worktree deployment: $target_deployment"; return 0 ;;
  esac

  local env_file; env_file="$(mktemp -t saveit-convex-env-cleanup)"
  ( cd "$backend_dir" && pnpm exec convex env list --deployment "$target_deployment" ) > "$env_file" 2>/dev/null || {
    rm -f "$env_file"; echo "[worktree-cleanup] could not list env for $target_deployment; skipping"; return 0; }
  [ -s "$env_file" ] || { rm -f "$env_file"; return 0; }

  echo "[worktree-cleanup] removing Convex env vars from $target_deployment"
  while IFS= read -r line; do
    local name="${line%%=*}"; name="${name#export }"
    [[ "$name" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]] || continue
    ( cd "$backend_dir" && pnpm exec convex env remove --deployment "$target_deployment" "$name" >/dev/null ) || true
  done < "$env_file"
  rm -f "$env_file"
}

cleanup_convex_env_vars

if [ "${CONVEX_WORKTREE_KEEP_LOCAL_STATE:-0}" != "1" ] && [ -d "$backend_dir/.convex" ]; then
  echo "[worktree-cleanup] removing local Convex state"
  trash_path "$backend_dir/.convex"
fi

rm -f apps/web/.env apps/mobile/.env apps/mobile/.env.development "$backend_dir/.env.local" "$backend_dir/.env-convex"
echo "[worktree-cleanup] cleanup complete"
