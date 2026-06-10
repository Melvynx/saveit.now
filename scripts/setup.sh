#!/usr/bin/env bash
# Backwards-compatible alias → the Convex-based worktree setup.
exec "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/worktree-setup.sh" "$@"
