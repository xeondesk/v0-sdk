#!/usr/bin/env bash
# Reproducible build gate for v0-sdk.
#
# Mirrors the repository CI (.github/workflows/ci.yaml) locally so the
# project can be built identically on any Amazon Linux 2023 host/container.
# Used by the Dockerfile build step; also runnable directly:
#
#   ./scripts/reproduce.sh
#
# Fails fast: the first failing step aborts with a non-zero exit code.

set -euo pipefail

cd "$(dirname "$0")/.."

echo "==> [1/7] bun install"
bun install

echo "==> [2/7] bun run generate"
bun run generate

echo "==> [3/7] bun run lint"
bun run lint

echo "==> [4/7] bun run fmt:check"
bun run fmt:check

echo "==> [5/7] bun run build"
bun run build

echo "==> [6/7] bun run typecheck"
bun run typecheck

echo "==> [7/7] bun run test"
bun run test

echo "==> build gate passed"
