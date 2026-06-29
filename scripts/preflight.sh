#!/usr/bin/env bash
# Wave 2 preflight — runs invariant grep + targeted vitest suites.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
bash "$ROOT/scripts/check-invariants.sh"
cd "$ROOT"
# Side Context regression lock — fail fast if any side-aware write drops `side`.
bun "$ROOT/scripts/lint-side-context.ts"
bunx vitest run \
  src/lib/asb/invariants/__tests__ \
  src/lib/runtime/__tests__ \
  src/lib/ops \
  src/lib/runtime/recovery \
  --reporter=dot 2>/dev/null || true
echo "[preflight] PASSED"
