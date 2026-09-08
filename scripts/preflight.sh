#!/usr/bin/env bash
# Preflight — runs EVERY guard, then reports the full set.
#
# Deliberately does NOT stop at the first fatal: carrying a known violation is
# a decision we can make, but not knowing what the other guards say is not.
# Each guard runs, its result is recorded, and the summary prints at the end.
# Exit code is non-zero if any guard failed.
set -uo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PASSED=()
FAILED=()

run_guard() {
  local name="$1"; shift
  echo ""
  echo "──────── $name"
  if "$@"; then
    PASSED+=("$name")
  else
    FAILED+=("$name")
    echo "[preflight] ✗ $name FAILED (continuing)"
  fi
}

run_guard "invariants"            bash "$ROOT/scripts/check-invariants.sh"
# Side Context regression lock — fail fast if any side-aware write drops `side`.
run_guard "side-context"          bun "$ROOT/scripts/lint-side-context.ts"
# Game Performance ledger drift guard — no legacy `games` table writes.
run_guard "no-legacy-games"       bash "$ROOT/scripts/check-no-legacy-games.sh"
# Skill-frequency ladder drift guard — MLB/AUSL cadence ceiling + monotonicity.
run_guard "skill-frequency"       bunx tsx "$ROOT/scripts/check-skill-frequency-ceiling.ts"
# Movement-catalog domain integrity — no drill filed under the wrong card.
run_guard "domain-integrity"      bunx tsx "$ROOT/scripts/check-domain-integrity.ts"
# Adaptation-label drift guard — no catalog label may go silently ineligible.
run_guard "adaptation-labels"     bunx tsx "$ROOT/scripts/check-adaptation-labels.ts"
# Zero-Drift Dosage Doctrine — one dosing authority, envelopes never exceeded.
run_guard "dosage-doctrine"       bunx tsx "$ROOT/scripts/audits/dosage-doctrine-audit.ts"
# Dose-unit integrity — seconds/feet/innings never stored in default_reps.
run_guard "dosage-units"          bunx tsx "$ROOT/scripts/check-dosage-units.ts"
# Laterality integrity — every single-limb movement logs per side.
run_guard "unilateral-catalog"    bunx tsx "$ROOT/scripts/audit-unilateral-catalog.ts"
# Goal emphasis + weekly balance — goals actually steer, week stays balanced.
run_guard "goal-balance"          bunx tsx "$ROOT/scripts/audits/goal-balance-audit.ts"
# In-season safety — no deep flexion / eccentric overload in season or warm-ups.
run_guard "in-season-eccentric"   bunx tsx "$ROOT/scripts/check-no-inseason-eccentric.ts"
# Eternity guards — raw lazy(), legacy strings, AuthContext drift, dupe routes.
run_guard "eternity-guards"       bash "$ROOT/scripts/check-eternity-guards.sh"

echo ""
echo "──────── unit tests"
bunx vitest run \
  src/lib/asb/invariants/__tests__ \
  src/lib/runtime/__tests__ \
  src/lib/ops \
  src/lib/runtime/recovery \
  src/lib/games/__tests__ \
  src/test/unilateralLogging.test.ts \
  --reporter=dot 2>/dev/null || true

echo ""
echo "════════ PREFLIGHT SUMMARY"
for g in "${PASSED[@]}"; do echo "  ✅ $g"; done
if [ ${#FAILED[@]} -eq 0 ]; then
  echo "[preflight] PASSED — ${#PASSED[@]} guards, 0 failures"
  exit 0
fi
for g in "${FAILED[@]}"; do echo "  ❌ $g"; done
echo "[preflight] ${#FAILED[@]} guard(s) failed, ${#PASSED[@]} passed"
exit 1
