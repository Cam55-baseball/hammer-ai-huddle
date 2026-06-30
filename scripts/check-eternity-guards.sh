#!/usr/bin/env bash
# Eternity guards — fail the build on regressions that have bitten users:
#   1. raw `lazy(() => import(...))` calls (must use lazyWithRetry)
#   2. "Progress Dashboard" string drift (must be "The General")
#   3. legacy `team_name` writes on the old `games` table (handled separately)
#   4. AuthContext import drift (canonical = @/contexts/AuthContext)
#   5. duplicate route paths in src/App.tsx
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

fail=0

# 1) raw lazy() in app code (App.tsx is allowed to import the helper itself)
raw_lazy=$(rg -n --no-heading 'lazy\(\(\)\s*=>\s*import\(' src \
  | grep -v 'utils/lazyWithRetry' \
  | grep -v 'lazyWithRetry' \
  || true)
if [ -n "$raw_lazy" ]; then
  echo "[eternity-guard] raw lazy() imports forbidden — use lazyWithRetry from @/utils/lazyWithRetry:"
  echo "$raw_lazy"
  fail=1
fi

# 2) renamed module — no string drift in product surfaces
drift=$(rg -n --no-heading 'Progress Dashboard' src || true)
if [ -n "$drift" ]; then
  echo "[eternity-guard] 'Progress Dashboard' must be 'The General':"
  echo "$drift"
  fail=1
fi

# 3) AuthContext canonical path
bad_auth=$(rg -n --no-heading "from ['\"](?!@/contexts/AuthContext)[^'\"]*AuthContext['\"]" src || true)
if [ -n "$bad_auth" ]; then
  echo "[eternity-guard] non-canonical AuthContext import:"
  echo "$bad_auth"
  fail=1
fi

# 4) duplicate route paths
dupe=$(rg -n --no-heading '<Route\s+path="([^"]+)"' src/App.tsx -o -r '$1' \
  | sort | uniq -d || true)
if [ -n "$dupe" ]; then
  echo "[eternity-guard] duplicate <Route path>:"
  echo "$dupe"
  fail=1
fi

if [ "$fail" -ne 0 ]; then
  echo "[eternity-guard] FAILED"
  exit 1
fi
echo "[eternity-guard] PASSED"
