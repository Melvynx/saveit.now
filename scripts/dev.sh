#!/usr/bin/env bash
# Start the SaveIt dev stack on a given port, keeping the Convex SITE_URL in sync
# so Better Auth redirects / cookies match the local origin.
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$script_dir/worktree-context.sh"

port="$(resolve_port "${1:-}" 3000)"

echo "[dev] setting SITE_URL=http://localhost:$port on the Convex deployment"
convex env set SITE_URL "http://localhost:$port" >/dev/null || true

echo "[dev] starting Convex (watch) + web on port $port"
PORT="$port" exec pnpm dev
