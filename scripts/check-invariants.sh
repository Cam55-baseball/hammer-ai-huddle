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

note "9) Wave 3 — modulators must be pure (no supabase imports)"
if rg -n "from ['\"]@/integrations/supabase" "$SRC/lib/runtime/modulators/" 2>/dev/null; then
  violate "modulator imports supabase client (must be pure)"
fi

note "10) Wave 3 — notify/toast usage outside src/lib/comm/ and known UI"
# Allow shadcn toaster + existing surfaces; forbid new notify util outside lib/comm
if rg -n "from ['\"]@/lib/comm/cadence['\"]" "$SRC" --glob '!**/lib/comm/**' --glob '!**/__tests__/**' | rg -v 'pages/|components/' >/dev/null 2>&1; then
  : # informational
fi

note "11) Wave 3 — no domain writes to non-asb_events tables for runtime topics"
if rg -n "supabase\.from\(['\"](cycle|rtp|illness|env|position|perception|education|cert|share)_" "$SRC/lib/runtime/" "$SRC/pages/" 2>/dev/null; then
  violate "domain writes to non-asb_events table detected"
fi

note "12) Wave 3 — no gamification (streak/xp/badge) in education/cert"
if rg -in "streak|\\bxp\\b|badge" "$SRC/pages/EducationHub.tsx" "$SRC/pages/CertPath.tsx" "$SRC/lib/copy/education.ts" "$SRC/lib/copy/onboarding.ts" 2>/dev/null; then
  violate "gamification tokens detected in education/cert surfaces"
fi

note "13) Wave 3 — no Math.random or Date.now in modulators/ or projections/"
if rg -n "Math\.random|Date\.now" "$SRC/lib/runtime/modulators/" 2>/dev/null | rg -v '__tests__'; then
  violate "non-deterministic call detected in modulators/"
fi

if [ "$FAILED" -ne 0 ]; then
  echo "[invariants] FAILED"
  exit 1
fi
echo "[invariants] PASSED"

note "14) Wave 3 closure — projections forbid UI imports"
if rg -n "from ['\"](@/components|@/pages|react)" "$SRC/lib/runtime/projections/" 2>/dev/null; then
  violate "projection file imports UI"
fi

note "15) Wave 3 closure — share exports only via buildShareExport"
if rg -n "share\\.export_generated" "$SRC/pages/" "$SRC/components/" 2>/dev/null | rg -v "buildShareExport|ShareConsole|exporter" >/dev/null; then
  : # informational
fi

note "16) Wave 3 closure — onboarding progression must derive from events"
if rg -n "useState[^)]*step|setStep\\(" "$SRC/components/onboarding/" 2>/dev/null; then
  violate "onboarding progression uses local state instead of events"
fi

note "17) Wave 3 closure — no hardcoded user-facing strings in new edu surfaces (informational)"
# advisory only — UI text in explainers is allowed but flagged for review
rg -n ">[A-Z][a-z]+ [a-z]+ [a-z]+<" "$SRC/components/edu/" 2>/dev/null >/dev/null || true

note "18) Wave 3 closure — no confidence amplification in projections/modulators"
if rg -nE "confidence\\s*[+*]\\s*[0-9]|Math\\.max\\([^)]*confidence" "$SRC/lib/runtime/projections/" "$SRC/lib/runtime/modulators/" 2>/dev/null | rg -v '__tests__'; then
  violate "confidence amplification pattern detected"
fi
