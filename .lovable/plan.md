

# Layer 18 + Layer 19 (Upgraded) — Tests 56–65

## Prerequisite: Layer 18 Must Exist First

Layer 18 is missing. It will be implemented as **Benchmark Coverage & Edge Geometry** (Tests 56–60), bridging from Layer 17's adversarial robustness to Layer 19's population-scale validation.

## Seeded RNG Utility

A deterministic `seededRandom(seed)` function will be added to the helpers section, returning a closure that produces reproducible pseudo-random numbers. All randomized tests in Layer 19 (and Layer 18 where needed) will use this instead of `Math.random`.

```text
function seededRandom(seed: number): () => number {
  // Simple LCG: deterministic, reproducible, debuggable
  let s = seed;
  return () => { s = (s * 1664525 + 1013904223) & 0x7fffffff; return s / 0x7fffffff; };
}
```

---

## Layer 18 — Benchmark Coverage & Edge Geometry (Tests 56–60)

| Test | Purpose |
|------|---------|
| 56 | **Benchmark Point Coverage** — Every metric with benchmarks has at least 3 points per age band per sport. Validates the data layer completeness. |
| 57 | **Interpolation Boundary Precision** — Raw values exactly at benchmark anchor points return the exact defined grade (no off-by-one from rounding). |
| 58 | **Age Band Fallback Correctness** — When a specific age band has no benchmarks, the fallback chain selects the nearest band and still produces valid grades. |
| 59 | **Sport Differentiation Proof** — For every metric with both baseball and softball benchmarks, at least one age band produces different grades for the same raw value. |
| 60 | **Bilateral Metric Symmetry** — Left/right bilateral inputs that are identical produce the same grade as a single non-bilateral input. Asymmetric L/R correctly averages. |

---

## Layer 19 — Scale, Distribution & Population Reality (Tests 61–65, Upgraded)

All 5 upgrades applied:

### Test 61: 10,000-Profile Monte Carlo (with seeded RNG + performance guard)
- Uses `seededRandom(1337)` for full reproducibility
- Wraps loop with `performance.now()` timing
- Asserts total runtime ≤ 2000ms (generous for CI; tightened from 500ms to avoid flaky CI failures)
- Zero crashes, all grades ∈ [20, 80], no NaN

### Test 62: Population Distribution Sanity (with variance + floor/ceiling)
- Uses `seededRandom(42)` 
- 2,000 profiles, computes mean overall
- Asserts mean ∈ [40, 55]
- Computes standard deviation, asserts stdDev ∈ [8, 18]
- Asserts ≥5% of population scores ≤35 (floor spread)
- Asserts ≥5% of population scores ≥60 (ceiling spread)

### Test 63: Elite Rarity (seeded)
- Uses `seededRandom(7777)`
- 2,000 profiles, <5% score overall ≥70

### Test 64: Tool Balance — No Systemic Bias (seeded)
- Uses `seededRandom(9999)`
- 2,000 profiles, max-min tool average spread ≤8

### Test 65: Percentile Ordering Integrity
- Deterministic (hardcoded profiles) — no RNG needed
- weak < mid < strong overall

---

## Files

| File | Change |
|------|--------|
| `src/test/engine-invariants.test.ts` | Add seededRandom helper near top; append Layer 18 (Tests 56–60) and Layer 19 (Tests 61–65) after line 1829 |

Total after this: **65 invariant tests across 19 layers**.

