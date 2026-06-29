#!/usr/bin/env bash
# Drift guard — fail if any source file references the dropped legacy
# game tables (games, at_bats, pitches, defense_plays, baserun_events).
# All game-performance access must go through the gp_* ledger via
# src/lib/games/ledger.ts.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# Allowed strings: gp_games, gp_at_bats, ... — the regex requires a word
# boundary BEFORE the table name so `gp_games` doesn't match.
PATTERN='(^|[^_a-zA-Z])(games|at_bats|pitches|defense_plays|baserun_events)\b'

# Allowlist: ledger adapter, migration files, this script, and a few
# unrelated tables that share the suffix (e.g. `live_ab_links` is fine
# because `at_bats` is a strict word — but be defensive anyway).
EXCLUDE_DIRS=("supabase/migrations" "node_modules" "dist" ".lovable" "scripts/check-no-legacy-games.sh")
EXCLUDE_FILES=("src/lib/games/ledger.ts")

EX_ARGS=()
for d in "${EXCLUDE_DIRS[@]}"; do EX_ARGS+=( -g "!${d}" ); done
for f in "${EXCLUDE_FILES[@]}"; do EX_ARGS+=( -g "!${f}" ); done

cd "$ROOT"

# Search source code only.
HITS=$(rg --no-heading --line-number -e "from\(['\"]?(games|at_bats|pitches|defense_plays|baserun_events)['\"]?\)" \
  -g 'src/**/*.{ts,tsx}' \
  "${EX_ARGS[@]}" || true)

if [[ -n "$HITS" ]]; then
  echo "[check-no-legacy-games] FAIL — legacy game-table references found:" >&2
  echo "$HITS" >&2
  echo "" >&2
  echo "Use the gp_* ledger via src/lib/games/ledger.ts (gp('gp_at_bats')...)." >&2
  exit 1
fi

echo "[check-no-legacy-games] OK — no legacy game-table references"
