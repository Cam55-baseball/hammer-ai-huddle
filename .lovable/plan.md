

# Invariant Test Suite — Performance Intelligence Engine

## Architecture

One test file: `src/test/engine-invariants.test.ts`
Uses Vitest (already in project). Pure logic tests — no UI, no Supabase, no network.

Imports the 4 engine modules directly and runs all 20 layers.

## Test Structure (6 Layers, 20 Tests)

### Layer 1 — Mathematical Integrity

**Test 1: Monotonic Sweep**
For every metric key in `GRADE_BENCHMARKS`, sweep from `min` to `max` in small steps. Assert grades are strictly monotonic (non-decreasing for `higherIsBetter`, non-increasing otherwise). Covers both baseball and softball, all age bands.

**Test 2: Boundary Flood**
Feed `rawToGrade` with: `NaN`, `Infinity`, `-Infinity`, `-1000`, `0`, `9999`, `undefined` cast to number. Assert every output is either `null` or within `[20, 80]`. No crashes.

**Test 3: Determinism**
Run `rawToGrade` 1000 times with identical inputs. Assert all outputs identical. Same for `computeToolGrades` and `generateReport`.

**Test 4: Tool Isolation**
Build a full result set (15 metrics). Compute tool grades. Remove one metric at a time. Assert: only the tool containing that metric changes. No unexpected jumps in unrelated tools. Removed metric's tool grade either changes slightly or becomes null — never increases influence.

### Layer 2 — Engine Truth Validation

**Test 5: Causal Flip**
Start with a low `mb_rotational_throw` (grade ~30). Generate report → confirm it's a limiting factor. Increase only that metric to grade ~70. Regenerate → confirm it's gone from limiting factors and a different metric takes its place.

**Test 6: Contradiction**
Feed elite exit velo (100mph → ~80 grade) + terrible rotational power (5ft → ~20 grade). Assert: rotational power appears as limiting factor with causal message linking it to exit velocity. System does NOT label both as strengths.

**Test 7: Sensitivity**
Change `bat_speed` from 64 to 65. Assert grade change ≤ 3 points. Assert tool grade change ≤ 2 points. No wild swings.

**Test 8: Projection Reality (Plateau)**
Feed 3 test cycles with identical values (e.g., `tee_exit_velocity: 85` all three). Run `computeTrends`. Assert trend = `'plateaued'`. Assert projection is `null` (no fake prediction).

### Layer 3 — Data Integrity

**Test 9: Schema Chaos**
Feed `gradeAllResults` with: `{ "ten_yard_dash": "fast" as any, "exit_velo": null as any, "random_key": 999, "_metadata": 42, "tee_exit_velocity": 85 }`. Assert: no crash, only `tee_exit_velocity` produces a valid grade, all others ignored.

**Test 10: Historical Compatibility (v1/v2)**
Feed results with v1 keys (`ten_yard_dash`, `tee_exit_velocity`) and v2 keys mixed. Assert all valid keys grade correctly. Unknown keys return null.

**Test 11: Bilateral Conflict**
Feed `sl_broad_jump_left: 95` (elite) and `sl_broad_jump_right: 45` (poor). Compute tool grades. Assert: the tool uses the average, not just one side. Assert the average is ~midpoint grade, not blindly 80.

### Layer 4 — Tier & Sport Truth

**Test 12: Sport Flip**
Same raw data, run as baseball then softball. Assert: grades differ (benchmarks differ). Assert: raw inputs identical, grade outputs NOT identical for at least speed and velo metrics.

**Test 13: Tier Degradation**
Run the same athlete at 3 tier levels (14 free metrics, 30 paid, 40 elite). Assert: core tool grades (from overlapping metrics) remain within ±5 points. Conclusions don't wildly flip. More data = more precision, not contradiction.

### Layer 5 — Intelligence Coherence

**Test 14: Empty State**
Feed empty results `{}` to `generateReport`. Assert: no crash, all tool grades null, empty strengths, empty limiting factors, training priority is the fallback message.

**Test 15: Partial Data (3 metrics)**
Feed only `ten_yard_dash`, `tee_exit_velocity`, `long_toss_distance`. Assert: produces valid report. Only tools with contributing metrics get grades. Others are null. No overconfident language.

**Test 16: Adaptive Focus — No History**
Call `getNextTestFocus([])`. Assert: returns empty prioritized/reduced with "Complete your first test" message.

**Test 17: Adaptive Focus — Shift After Improvement**
Cycle 1: metric A is grade 30 → prioritized. Cycle 2: metric A improves to 70 → should move to reduced. Assert priority shifts correctly.

### Layer 6 — Longitudinal Engine

**Test 18: Trend Improving**
3 cycles: grade 40 → 47 → 55. Assert trend = `'improving'`, rate > 1.5, projection not null.

**Test 19: Trend Regressing**
3 cycles: grade 60 → 55 → 48. Assert trend = `'regressing'`, rate < -1.5, projection contains "Declining".

**Test 20: Insufficient History**
1 cycle only. Assert `computeTrends` returns empty array.

## Implementation Details

- Single file: `src/test/engine-invariants.test.ts`
- No mocks needed — all engines are pure functions
- Uses `describe` blocks per layer
- Imports: `rawToGrade`, `gradeAllResults` from `gradeEngine`; `computeToolGrades` from `positionToolProfiles`; `generateReport` from `testIntelligenceEngine`; `getNextTestFocus` from `adaptiveTestPriority`; `computeTrends` from `longitudinalEngine`; `GRADE_BENCHMARKS` from `gradeBenchmarks`; `METRIC_BY_KEY`, `PERFORMANCE_METRICS` from `performanceTestRegistry`
- Tests 9-11 (concurrency, lock, crash recovery, realtime) from the user's Layer 3 require live Supabase infrastructure — these will be documented as integration test stubs that can be run against the edge functions separately

## What This Does NOT Cover (and Why)

Tests 9-12 from user's **Layer 3** (session storm, concurrency locks, crash recovery, realtime failure) and **Layer 6** (UI truth) are infrastructure/integration tests that require:
- Live Supabase edge functions
- WebSocket connections
- Concurrent HTTP requests

These cannot run as Vitest unit tests. They would be separate edge function test scripts. The 20 tests above cover all **pure logic invariants** — the things that must mathematically never lie.

## Files

| File | Action |
|------|--------|
| `src/test/engine-invariants.test.ts` | Create — 20 invariant tests across 6 layers |

