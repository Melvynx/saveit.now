#!/usr/bin/env bash
# Backwards-compatible alias → the Convex-based worktree cleanup.
exec "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/worktree-cleanup.sh" "$@"
