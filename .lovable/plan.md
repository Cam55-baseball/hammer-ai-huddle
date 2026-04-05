

# Layers 11–15: Ground Truth, Snapshot Invariance, Deterministic Replay, Cross-Engine Consistency, Integration Kill Tests

Append 5 new `describe` blocks (Tests 31–40) to `src/test/engine-invariants.test.ts`.

## Layer 11 — Ground Truth Validation (Tests 31–33)

**Test 31: Real Athlete Profile — Elite Baseball SS**
- Hardcode a real-world elite SS profile: 1.55s 10yd, 6.7s 60yd, 95mph exit velo, 88mph throw, 32" vert, etc.
- Assert: Run tool ≥ 65, Arm tool ≥ 60, Hit tool ≥ 60, Overall ≥ 60
- Assert: No metric grades below 50 (elite profile must not produce below-average grades)
- Assert: Top strengths include speed or arm metrics (real-world expectation)

**Test 32: Real Athlete Profile — Average 14u Freshman**
- Hardcode average freshman: 2.0s 10yd, 8.0s 60yd, 65mph exit velo, 55mph throw, 20" vert
- Assert: All tool grades cluster around 40–50 (average range)
- Assert: Overall ∈ [38, 52]
- Assert: Limiting factors exist (average players always have development areas)

**Test 33: Real Athlete Profile — Below-Average with One Standout**
- Profile: mostly poor metrics except elite 60yd dash (6.5s)
- Assert: Run tool is clearly the highest tool grade
- Assert: Run-related metrics appear in top strengths
- Assert: Overall is NOT elite (one tool cannot mask weakness)
- Assert: Training priority does NOT reference speed/run

## Layer 12 — Snapshot Invariance (Tests 34–35)

**Test 34: Report Snapshot Freeze**
- Run `generateReport` with FULL_RESULTS (the existing fixture) for baseball SS age 16
- Hardcode the EXACT expected output: specific tool grades, specific top 3 strengths keys, specific limiting factor keys, specific training priority substring
- Assert: output matches snapshot exactly
- If this test ever breaks without a code change → the engine drifted (impossible in deterministic code, but proves it)

**Test 35: Tool Grade Snapshot Freeze**
- Run `computeToolGrades` with FULL_RESULTS for every position in `POSITION_TOOL_PROFILES`
- Hardcode expected overall grade for each position (compute once, freeze as constants)
- Assert: every position's overall matches the frozen value exactly
- This locks the weight system against silent regressions

## Layer 13 — Deterministic Replay (Tests 36–37)

**Test 36: Session Replay — 3-Cycle History**
- Define 3 test entries with specific raw values and dates
- Run `computeTrends` → freeze exact output (trend direction, rate, projection text for each metric)
- Assert: output matches frozen snapshot
- Run again 100 times → assert identical every time

**Test 37: Adaptive Priority Replay**
- Define 2-cycle history with specific values (one metric improved, one declined)
- Run `getNextTestFocus` → freeze exact prioritized/reduced lists
- Assert: output matches frozen snapshot
- The declined metric must be prioritized; the improved metric must be in reduced (if grade > 65)

## Layer 14 — Cross-Engine Consistency (Tests 38–39)

**Test 38: Grade Engine ↔ Intelligence Engine Agreement**
- Run `gradeAllResults` on FULL_RESULTS
- Run `generateReport` on same FULL_RESULTS
- Assert: every metric grade in the report matches `gradeAllResults` output exactly
- Assert: report's topStrengths are the 3 highest grades from `gradeAllResults`
- Assert: report's limitingFactors are from the lowest grades (excluding strengths)

**Test 39: Tool Grades ↔ Report Tool Grades Agreement**
- Run `computeToolGrades` standalone
- Run `generateReport` (which calls `computeToolGrades` internally)
- Assert: every tool grade in the report matches standalone computation exactly
- Assert: overall matches exactly
- This proves no internal computation divergence

## Layer 15 — Integration Kill Tests (Tests 40–42)

**Test 40: Concurrent Computation Determinism**
- Launch 100 parallel `Promise.all` calls to `computeToolGrades` + `generateReport` with identical inputs
- Assert: all 100 results are byte-identical (JSON.stringify comparison)
- Proves no shared mutable state between calls

**Test 41: Partial Failure Cascade**
- Start with full results → compute report (baseline)
- Progressively remove one metric at a time and recompute
- Assert: at each step, remaining tool grades are valid (no NaN, no crash)
- Assert: when the last metric of a tool is removed, that tool becomes null
- Assert: overall adjusts proportionally (never jumps erratically)

**Test 42: Extreme Volume Stress**
- Generate 50,000 random result sets
- Run `computeToolGrades` on each
- Assert: zero NaN, zero crashes, all grades ∈ [20, 80] or null
- Assert: completes in < 10 seconds (performance bound)

## Implementation Notes

- Snapshot values will be computed once by running the engines during test creation, then hardcoded as constants
- The snapshot tests (34–37) serve as regression anchors — they break only if engine logic changes
- Test 40 uses `Promise.all` to verify no race conditions in pure functions
- Test 42 adds a performance ceiling assertion

## Files

| File | Change |
|------|--------|
| `src/test/engine-invariants.test.ts` | Append Layers 11–15 (Tests 31–42) after line 880 |

Total after this: 42 invariant tests across 15 layers.

