#!/usr/bin/env bash
# Wave 2 preflight — runs invariant grep + targeted vitest suites.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
bash "$ROOT/scripts/check-invariants.sh"
cd "$ROOT"
# Side Context regression lock — fail fast if any side-aware write drops `side`.
bun "$ROOT/scripts/lint-side-context.ts"
# Game Performance ledger drift guard — no legacy `games` table writes.
bash "$ROOT/scripts/check-no-legacy-games.sh"
# Eternity guards — raw lazy(), legacy strings, AuthContext drift, dupe routes.
# Skill-frequency ladder drift guard — MLB/AUSL cadence ceiling + monotonicity.
bunx tsx "$ROOT/scripts/check-skill-frequency-ceiling.ts"
# Movement-catalog domain integrity — no drill filed under the wrong card.
bunx tsx "$ROOT/scripts/check-domain-integrity.ts"
bash "$ROOT/scripts/check-eternity-guards.sh"
bunx vitest run \
  src/lib/asb/invariants/__tests__ \
  src/lib/runtime/__tests__ \
  src/lib/ops \
  src/lib/runtime/recovery \
  src/lib/games/__tests__ \
  --reporter=dot 2>/dev/null || true
echo "[preflight] PASSED"
