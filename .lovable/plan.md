

# Layer 20 — Calibration Enforcement & Truth Lock (Tests 66–70)

Append after line 2141 in `src/test/engine-invariants.test.ts`.

## Tests

| Test | Purpose | Key Assertion |
|------|---------|---------------|
| 66 | Distribution compression detection | stdDev ≥ 7.5 across 2,000 seeded profiles |
| 67 | Elite visibility with targeted profiles | ≥15% of intentionally high-end profiles score ≥70 overall |
| 68 | Tool equity enforcement | Spread ≤10 AND no single tool's average exceeds 40% of total tool average sum |
| 69 | Scaling sensitivity | +10% improvement on all inputs → ≥+5 overall increase |
| 70 | Inversion resistance | 10 pairs of strictly-ordered profiles must always rank correctly |

## Test Details

### Test 66: Distribution Compression Detection
- Uses `seededRandom(2024)`, 2,000 uniform profiles via existing `generateProfile`
- Computes stdDev of overall grades
- Asserts `stdDev ≥ 7.5` — if the system compresses grades into a narrow band, this fails
- **If it fails**: Fix the benchmark spacing in `gradeBenchmarks.ts` to widen the grade spread, not the test threshold

### Test 67: Elite Visibility with Targeted Profiles
- Generate 200 profiles where ALL metrics are set to the top 20% of their range (e.g., EV 99–110, 60yd 6.2–6.6)
- Assert ≥15% (≥30 profiles) score overall ≥70
- This is NOT a random population test — it's a targeted test proving the system CAN produce elite grades when inputs warrant them
- **If it fails**: The benchmark ceiling in `gradeBenchmarks.ts` is too restrictive or tool averaging is suppressing elite signals

### Test 68: Tool Equity Enforcement
- Uses `seededRandom(5555)`, 2,000 profiles
- Compute per-tool averages
- Assert: `max - min ≤ 10`
- Assert: no single tool average exceeds 40% of the sum of all tool averages (prevents one tool from dominating the composite)
- **If it fails**: Position weight profiles or metric-to-tool mappings have systemic bias

### Test 69: Scaling Sensitivity
- Define 5 baseline profiles at different skill levels (weak, below-avg, avg, above-avg, strong)
- For each, create an improved version where every metric improves by 10% (higher-is-better × 1.10, lower-is-better × 0.90)
- Assert: improved overall ≥ baseline overall + 5
- **If it fails**: Benchmark curve is too flat in certain regions — fix by adding steeper interpolation points

### Test 70: Inversion Resistance (Pairwise)
- Define 10 profile pairs where Profile A is strictly better than Profile B on every metric
- Assert: `overall_A > overall_B` for all 10 pairs
- Pairs span the full range (floor-level, low, mid-low, mid, mid-high, high, elite boundary, elite, super-elite, max)
- **If it fails**: Fundamental interpolation or aggregation bug — fix the engine, not the test

## Engine Fixes (if tests fail)

The plan includes conditional fixes to make the system pass honestly:

1. **stdDev < 7.5 (Test 66)**: Widen benchmark point spacing in `gradeBenchmarks.ts` — increase the raw-value gap between grade 20 and grade 80 anchor points
2. **Elite suppression (Test 67)**: Check if `Math.round` in tool averaging clips elite grades — if 3 tools at 71 and 2 at 69 average to 70.2 → rounds to 70, that's fine. If the issue is benchmark ceilings, extend 80-grade anchor points to more achievable raw values
3. **Tool inequity (Test 68)**: Audit metric coverage per tool — if `arm` has 4 metrics and `hit` has 3, the averaging denominator differs, potentially causing bias
4. **Flat sensitivity (Test 69)**: Add intermediate benchmark points (grade 35, 50, 60) where curves are too flat

## Files

| File | Change |
|------|--------|
| `src/test/engine-invariants.test.ts` | Append Layer 20 (Tests 66–70) after line 2141 |
| `src/data/gradeBenchmarks.ts` | Potentially adjust benchmark spacing if Tests 66/67/69 fail |
| `src/lib/gradeEngine.ts` | No changes expected unless interpolation bug found |

Total after this: **70 invariant tests across 20 layers**.

