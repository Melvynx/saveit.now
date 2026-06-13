#!/usr/bin/env bash
# Shared helpers for SaveIt worktree environment management (Conductor / Codex /
# Cursor). Convex-based. Mirrors the nowstack-saas pattern.

resolve_worktree_path() {
  local script_dir="$1"
  local worktree_path="${CODEX_WORKTREE_PATH:-${CONDUCTOR_WORKSPACE_PATH:-${CURSOR_WORKTREE_PATH:-$(pwd)}}}"

  if [ ! -f "$worktree_path/package.json" ] && [ -f "$script_dir/../package.json" ]; then
    worktree_path="$(cd "$script_dir/.." && pwd)"
  fi

  printf '%s\n' "$worktree_path"
}

resolve_source_tree() {
  printf '%s\n' "${CODEX_SOURCE_TREE_PATH:-${CONDUCTOR_ROOT_PATH:-${ROOT_WORKTREE_PATH:-${CURSOR_ROOT_WORKSPACE_PATH:-$HOME/Developer/saas/saveit.now-mono}}}}"
}

ensure_source_tree_exists() {
  local source_tree="$1"
  local log_prefix="$2"

  if [ ! -d "$source_tree" ]; then
    echo "[$log_prefix] source checkout not found: $source_tree" >&2
    exit 1
  fi
}

ensure_not_source_tree() {
  local source_tree="$1"
  local allow_env_name="$2"
  local log_prefix="$3"
  local action="$4"

  if [ -d "$source_tree" ] && [ "$(pwd)" = "$(cd "$source_tree" && pwd)" ] && [ "${!allow_env_name:-0}" != "1" ]; then
    echo "[$log_prefix] refusing to $action the source checkout"
    exit 0
  fi
}

resolve_workspace_name() {
  local workspace_name="${CONDUCTOR_WORKSPACE_NAME:-${CODEX_WORKTREE_NAME:-${CURSOR_WORKTREE_NAME:-}}}"

  if [ -z "$workspace_name" ]; then
    workspace_name="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || basename "$PWD")"
  fi

  if [ "$workspace_name" = "HEAD" ] || [ -z "$workspace_name" ]; then
    local parent_dir grandparent_dir
    parent_dir="$(basename "$(dirname "$PWD")")"
    grandparent_dir="$(basename "$(dirname "$(dirname "$PWD")")")"
    if [ "$grandparent_dir" = "worktrees" ]; then
      workspace_name="$parent_dir"
    fi
  fi

  if [ "$workspace_name" = "HEAD" ] || [ -z "$workspace_name" ]; then
    workspace_name="$(basename "$PWD")"
  fi

  printf '%s\n' "$workspace_name"
}

trash_path() {
  local target="$1"
  if [ ! -e "$target" ]; then
    return 0
  fi
  if ! command -v trash >/dev/null 2>&1; then
    echo "[worktree-context] trash command not found; cannot remove $target safely" >&2
    exit 1
  fi
  trash "$target"
}

slugify() {
  local value="$1"
  local slug
  slug="$(printf '%s' "$value" | tr '/_ .' '----' | tr -cd '[:alnum:]-' | tr '[:upper:]' '[:lower:]' | sed -E 's/-+/-/g; s/^-//; s/-$//')"
  printf '%s\n' "${slug:-worktree}"
}

resolve_worktree_auth_cookie_prefix() {
  local workspace_slug="$1"
  local configured_prefix="${CONVEX_WORKTREE_AUTH_COOKIE_PREFIX:-}"
  local base_prefix="${CONVEX_WORKTREE_AUTH_COOKIE_PREFIX_BASE:-${BETTER_AUTH_COOKIE_PREFIX_BASE:-save-it}}"

  if [ -n "$configured_prefix" ]; then
    slugify "$configured_prefix"
    return 0
  fi
  slugify "$base_prefix-$workspace_slug"
}

resolve_port() {
  local cli_port="${1:-}"
  local default_port="${2:-3000}"
  printf '%s\n' "${cli_port:-${PORT:-${CONDUCTOR_PORT:-${CODEX_DEV_PORT_START:-$default_port}}}}"
}

resolve_convex_deployment_mode() {
  printf '%s\n' "${CONVEX_WORKTREE_DEPLOYMENT_MODE:-cloud}"
}

resolve_convex_deployment_ref() {
  local workspace_slug="$1"
  printf '%s\n' "${CONVEX_WORKTREE_DEPLOYMENT_REF:-dev/$workspace_slug}"
}

resolve_convex_import_source() {
  printf '%s\n' "${CONVEX_WORKTREE_IMPORT_SOURCE:-dev}"
}

resolve_convex_env_source() {
  printf '%s\n' "${CONVEX_WORKTREE_ENV_SOURCE:-$(resolve_convex_import_source)}"
}

# Run convex CLI from the backend package (where convex.json lives).
convex() {
  pnpm --filter @workspace/backend exec convex "$@"
}
