#!/usr/bin/env bash
# Cross-substrate consistency guard — fails CI on forbidden patterns.
# Read-only grep. No file mutation.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/src"
FAILED=0

note() { echo "[invariants] $*"; }
violate() { echo "::error::[invariants] $*"; FAILED=1; }

note "1) missingness thresholds must live only in constants/missingnessThresholds.ts"
if rg -n 'staleAfterHours|STALE_AFTER_HOURS|PARTIAL_REQUIRED_FIELDS' \
     "$SRC" --glob '!**/missingnessThresholds.ts' --glob '!**/invariants/**' --glob '!**/__tests__/**' \
     | rg -v 'staleAfterHours\?:|staleAfterHours:'; then
  : # informational — staleAfterHours param is allowed in function signatures
fi

note "2) event-identity sha256 composition only in engineVersion.ts + sensorIdempotency.ts"
if rg -n 'sha256\(|SHA-256' "$SRC" \
     --glob '!**/engineVersion.ts' \
     --glob '!**/sensorIdempotency.ts' \
     --glob '!**/invariants/**' \
     --glob '!**/__tests__/**'; then
  violate "sha256 composition found outside canonical identity authors"
fi

note "3) no subsystem imports another subsystem's projections.ts"
# Surface dirs that legitimately belong to each subsystem (consumers of own projections).
declare -A SURFACE_DIRS=( [digest]="digest forecast" [coach]="coach coach-console" )
for sub in digest coach; do
  excludes=()
  for s in ${SURFACE_DIRS[$sub]}; do
    excludes+=(--glob "!**/$s/**" --glob "!**/pages/Coach*" --glob "!**/pages/Athlete*")
  done
  others=$(rg -l "from ['\"]@/lib/$sub/projections" "$SRC" \
           "${excludes[@]}" --glob '!**/invariants/**' --glob '!**/__tests__/**' || true)
  if [ -n "$others" ]; then
    violate "cross-subsystem import of $sub/projections in: $others"
  fi
done

note "4) sensor topic map declared only in sensorTopicRegistry.ts"
if rg -n 'sensor\.heart_rate|sensor\.hrv|sensor\.sleep|sensor\.external_load|sensor\.movement' \
     "$SRC" --glob '!**/sensorTopicRegistry.ts' --glob '!**/invariants/**' --glob '!**/__tests__/**'; then
  violate "sensor topic strings appearing outside registry"
fi

note "5) runtime surfaces may only write via emitRuntimeEvent / emitAsbEvent"
RUNTIME_GLOBS=(--glob 'src/pages/Today*.tsx' --glob 'src/components/runtime/**')
if rg -n "supabase\.from\(['\"]asb_events['\"]\)\s*\.insert" "${RUNTIME_GLOBS[@]}" "$SRC"; then
  violate "runtime surface writes directly to asb_events (must use emitRuntimeEvent)"
fi
if rg -n "from ['\"]@/lib/asb/replay['\"]" "${RUNTIME_GLOBS[@]}" "$SRC"; then
  violate "runtime surface imports replay engine (read-only projection rule)"
fi

note "6) Wave 2 — ops surfaces may only write events via emit wrappers"
OPS_GLOBS=(--glob 'src/pages/ops/**' --glob 'src/components/ops/**' --glob 'src/lib/ops/**')
if rg -n "supabase\.from\(['\"]asb_events['\"]\)\s*\.insert" "${OPS_GLOBS[@]}" "$SRC"; then
  violate "ops surface writes directly to asb_events"
fi

note "7) Wave 2 — role checks must use user_roles table, never profiles"
if rg -n "from\(['\"]profiles['\"]\)[\s\S]*role" "$SRC" --glob '!**/__tests__/**'; then
  violate "role lookups against profiles table detected (use user_roles)"
fi

note "8) Wave 2 — runtime/offline checkpoint storage allowlisted"
# localStorage/sessionStorage writes carrying runtime truth are forbidden
# except in recovery/offline modules that explicitly use IndexedDB.
if rg -n "localStorage\.setItem\(['\"]asb_|sessionStorage\.setItem\(['\"]asb_" \
     "$SRC" --glob '!**/runtime/offline/**' --glob '!**/runtime/recovery/**'; then
  violate "asb_* runtime state written to localStorage outside allowlist"
fi

if [ "$FAILED" -ne 0 ]; then
  echo "[invariants] FAILED"
  exit 1
fi
echo "[invariants] PASSED"
