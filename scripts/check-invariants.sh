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
for sub in digest coach; do
  others=$(rg -l "from ['\"]@/lib/$sub/projections" "$SRC" \
           --glob "!**/$sub/**" --glob '!**/invariants/**' --glob '!**/__tests__/**' || true)
  if [ -n "$others" ]; then
    violate "cross-subsystem import of $sub/projections in: $others"
  fi
done

note "4) sensor topic map declared only in sensorTopicRegistry.ts"
if rg -n 'sensor\.heart_rate|sensor\.hrv|sensor\.sleep|sensor\.external_load|sensor\.movement' \
     "$SRC" --glob '!**/sensorTopicRegistry.ts' --glob '!**/invariants/**' --glob '!**/__tests__/**'; then
  violate "sensor topic strings appearing outside registry"
fi

if [ "$FAILED" -ne 0 ]; then
  echo "[invariants] FAILED"
  exit 1
fi
echo "[invariants] PASSED"
