

# Layers 7–10: Adversarial Invariant Suite

Append 4 new `describe` blocks (Tests 21–30) to `src/test/engine-invariants.test.ts`.

## Layer 7 — Adversarial Fuzz Testing (Tests 21–23)

**Test 21: 10,000-Case Randomized Simulation**
- Generate 10,000 random result sets (random metric subsets, random raw values within plausible ranges)
- For each: call `rawToGrade`, `computeToolGrades`, `generateReport`
- Assert invariants on every case:
  - All grades ∈ [20, 80] or null
  - No NaN anywhere in output
  - No thrown exceptions
  - Tool grades ∈ [20, 80] or null
  - Overall ∈ [20, 80] or null
  - Strengths never overlap with limiting factors (same metric key)

**Test 22: Type Corruption Fuzz**
- Feed results with: `undefined`, `null`, empty string, objects, arrays, booleans, negative numbers, extremely large numbers as metric values
- Assert: no crash, no NaN leak, all outputs valid or null

**Test 23: Position × Sport × Age Exhaustive Sweep**
- All 14 positions × 2 sports × 4 age bands = 112 combinations
- Fixed result set, run `computeToolGrades` and `generateReport` on each
- Assert: no crash, all grades valid, overall always within [20, 80] or null

## Layer 8 — Truth Consistency Validation (Tests 24–26)

**Test 24: Truth Inversion Test**
- For every metric with benchmarks: set value to produce grade ~80, then set to produce grade ~20
- Generate report for each
- Assert: the 80-grade metric NEVER appears in limiting factors; the 20-grade metric NEVER appears in top strengths
- This is the core "contradictions are mathematically impossible" proof

**Test 25: Strength/Limiter Mutual Exclusion**
- Run 1,000 random result sets through `generateReport`
- Assert: no metric key appears in BOTH `topStrengths` and `limitingFactors` simultaneously
- Zero tolerance — if even one overlap exists, test fails

**Test 26: Grade Ordering Consistency**
- For any two metrics A and B where gradeA > gradeB:
  - A must rank higher (or equal) in strengths sorting
  - B must rank higher (or equal) in limiters sorting
- Run across 500 random result sets

## Layer 9 — Weight Normalization Enforcement (Tests 27–28)

**Test 27: Weight Sum Validation**
- For every position profile in `POSITION_TOOL_PROFILES`: assert tool weights sum to exactly 1.0 (within floating point tolerance ±0.001)
- If weights don't sum to 1.0, overall grade computation is mathematically incorrect

**Test 28: Overall = Exact Weighted Average**
- For 500 random result sets: manually compute `sum(toolGrade[i] * weight[i]) / sum(weights where grade != null)`
- Assert: equals `computeToolGrades().overall` exactly (within ±1 for rounding)
- This proves overall is never fabricated

## Layer 10 — Projection Realism Constraints (Tests 29–30)

**Test 29: Projection Realism Bounds**
- Run 1,000 trend computations with various improvement rates
- Assert:
  - No projection predicts reaching a grade > 80
  - No projection predicts negative weeks
  - Plateau trends NEVER produce "Reach X" projections
  - Regressing trends NEVER produce positive projections
  - Projection weeks must be > 0 and < 520 (10 years max — beyond is meaningless)

**Test 30: Trend Classification Consistency**
- Generate 500 random 3-cycle histories
- Assert:
  - If cycle3 > cycle1 by meaningful amount → trend != 'regressing'
  - If cycle3 < cycle1 by meaningful amount → trend != 'improving'
  - If all cycles equal → trend = 'plateaued'
  - Rate sign matches trend direction (positive rate = improving, negative = regressing)

## Summary

| File | Change |
|------|--------|
| `src/test/engine-invariants.test.ts` | Append Layers 7–10 (Tests 21–30) after line 512 |

Total: 10 new tests, including the 10,000-case fuzz simulation and truth inversion proof. After this, the suite covers 30 invariant tests across 10 layers.

