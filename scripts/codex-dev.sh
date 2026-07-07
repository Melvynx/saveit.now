#!/usr/bin/env bash
# Codex/agent dev launcher: finds a free port starting at 3910 and runs start-all.
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$script_dir/worktree-context.sh"

worktree_path="$(resolve_worktree_path "$script_dir")"
cd "$worktree_path"

port="$(resolve_port "" 3910)"
while lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1; do
  port=$((port + 1))
done

echo "Starting SaveIt on http://localhost:$port"
exec pnpm start-all -p "$port"
