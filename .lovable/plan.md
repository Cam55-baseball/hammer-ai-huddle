

# Layer 21 — Elite Differentiation Engine (Tests 71–76)

## New File

**`src/lib/eliteScore.ts`** — Implement `computeEliteScore` exactly as specified. Pure function, no dependencies on engine internals beyond receiving tool grades and overall as input.

## Tests

**Append to `src/test/engine-invariants.test.ts`** after line 2328:

New `describe('Layer 21 — Elite Differentiation Engine')` block with 6 tests:

| Test | Assertion |
|------|-----------|
| 71 | `eliteOverall >= overall` for 10 diverse profiles |
| 72 | `overall < 40 → eliteOverall === overall` for 5 low-level profiles |
| 73 | Profile with one tool ≥75 gets higher eliteOverall than same profile capped at 65 |
| 74 | Profile with 3+ tools ≥65 gets synergyBoost (compare against profile with only 1 tool ≥65) |
| 75 | High-variance profile (one tool 78, others ~45) gets rarityBoost vs flat profile (all tools ~55) with same overall |
| 76 | `eliteOverall ≤ 80` for extreme profiles (all tools at 78–80) |

## Files

| File | Change |
|------|--------|
| `src/lib/eliteScore.ts` | Create with `computeEliteScore` function and `EliteInput` type |
| `src/test/engine-invariants.test.ts` | Import `computeEliteScore`; append Layer 21 (Tests 71–76) |

No changes to existing engine files, benchmarks, or invariant tests.

