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

echo "==> [1/8] bun install"
bun install

echo "==> [2/8] check lockstep package versions"
pkg_version() { node -e "const p=require('./$1/package.json'); process.stdout.write(p.version)"; }
pkg_v0_dep() { node -e "const p=require('./$1/package.json'); process.stdout.write((p.dependencies && p.dependencies.v0) || '')"; }
SDK_VERSION=$(pkg_version packages/v0-sdk)
AI_TOOLS_VERSION=$(pkg_version packages/ai-tools)
REACT_VERSION=$(pkg_version packages/react)
CREATE_APP_VERSION=$(pkg_version packages/create-v0-sdk-app)
AI_TOOLS_SDK_VERSION=$(pkg_v0_dep packages/ai-tools)
REACT_SDK_VERSION=$(pkg_v0_dep packages/react)
if [ "$SDK_VERSION" != "$AI_TOOLS_VERSION" ] || [ "$SDK_VERSION" != "$REACT_VERSION" ] || [ "$SDK_VERSION" != "$CREATE_APP_VERSION" ]; then
  echo "::error::v0, @v0-sdk/ai-tools, @v0-sdk/react, and create-v0-sdk-app versions must match (${SDK_VERSION}, ${AI_TOOLS_VERSION}, ${REACT_VERSION}, ${CREATE_APP_VERSION})."
  exit 1
fi
if [ "$SDK_VERSION" != "$AI_TOOLS_SDK_VERSION" ] || [ "$SDK_VERSION" != "$REACT_SDK_VERSION" ]; then
  echo "::error::Published package dependencies on v0 must match ${SDK_VERSION} (@v0-sdk/ai-tools: ${AI_TOOLS_SDK_VERSION}, @v0-sdk/react: ${REACT_SDK_VERSION})."
  exit 1
fi

echo "==> [3/8] bun run generate"
bun run generate

echo "==> [4/8] bun run lint"
bun run lint

echo "==> [5/8] bun run fmt:check"
bun run fmt:check

echo "==> [6/8] bun run build"
bun run build

echo "==> [7/8] bun run typecheck"
bun run typecheck

echo "==> [8/8] bun run test"
bun run test

echo "==> build gate passed"
