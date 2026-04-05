

# Full Verification Plan — Tool-Performance Gap System

## What We Know From Production Data (Just Queried)

### Pattern Generation — CONFIRMED WORKING
For athlete `95de827d`:
- **tool_grades**: `{arm: 80, hit: null, run: 20 (one test) / 50 (another), power: 36/80, field: null}`  
- **MPI composites**: `{bqi: 77.11, fqi: 73.33, pei: 78.89, decision: 77.78, competitive: 77.78}`
- **Generated pattern**: `tool_gap_run_physical` with score=17 (stored in `weakness_scores`)
- **Prescription**: "Sprint Mechanics Lab" appears in `prescriptive_actions[2]` with correct drill_type and module

### Ranking — CONFIRMED CORRECT (Tool Gap Lost Legitimately)
The `tool_gap_run_physical` pattern ranked #5 of 5 because:
- 3 vision_accuracy_low patterns at **high** severity (scores 36, 40, 61) → sort score = 3 × 1.0 = **3.0** each  
- 1 slow_reaction_time at **high** severity → sort score = **3.0**
- 1 tool_gap_run_physical at **medium** severity (delta=17, threshold ≥20 for high) → sort score = 2 × 1.4 = **2.8**

Tool gap correctly lost to 4 high-severity vision patterns. The +0.4 bonus is working (2.8 > 2.0 without bonus) but medium severity can't beat high severity patterns.

### Prescription — CONFIRMED INCLUDED
Sprint Mechanics Lab appears as the 3rd prescriptive_action. It was **appended** (not replacing anything) because the prescription builder iterates `allPatterns.slice(0, 5)` (line 1601) and tool_gap at position #5 IS within the top-5 slice.

### What Remains Unverified
1. **Determinism** — need 3 identical runs to prove same output
2. **Threshold sensitivity** — need to show delta < 15 correctly suppresses
3. **Negative/false-positive cases** — need athletes where gap should NOT fire
4. **Multiple tool gaps** — only `run` fired; `arm` (delta=80-67=13) correctly suppressed (< 15 threshold), `power` depends on which test row was selected

---

## Verification Plan (7 Tests)

### Test 1: Determinism — Run hie-analyze 3× on same athlete
- Invoke `hie-analyze` for `95de827d` three times
- Compare `weakness_clusters`, `primary_limiter`, `prescriptive_actions` across all 3
- Must be byte-identical (modulo `computed_at` timestamp)

### Test 2: Pattern Generation Trace
- Query `weakness_scores` after each run to confirm `tool_gap_run_physical` appears with score=17
- Verify `mapCompositeToToolScale(77.78) = 20 + (77.78/100)*60 = 66.67 → 67`
- `tool_grade run = 50` (latest test row), delta = `50 - 67 = -17`, absDelta = 17, direction = `perf_exceeds`
- `prescriptionClass = 'physical'`, severity = `'medium'` (17 < 20)
- Metric name: `tool_gap_run_physical` ✓

### Test 3: Ranking Validation
- Query full `weakness_scores` for the athlete (already done above — 5 rows)
- Verify sorting: vision patterns (high, score=3.0) > tool_gap (medium, score=2.8)
- Tool gap at position #5 is within `slice(0,5)` so it enters prescription builder

### Test 4: Threshold Sensitivity  
- The system already proves this: `arm` tool_grade=80 vs PEI mapped=67, delta=13 → correctly suppressed (< 15)
- To further validate: if we could set run tool_grade=55, delta would be `55-67=-12` → should NOT fire
- **Approach**: Create a test in `engine-invariants.test.ts` that calls the pure `analyzeToolPerformanceGaps` logic with deltas of 14, 15, and 20 to prove threshold boundary behavior

### Test 5: Negative Case — Athlete `57b007e3`
- Has tool_grades `{overall: 22, power: 25, run: 20}` and MPI composites `{bqi: 61.41, competitive: 56.88}`
- `mapCompositeToToolScale(56.88) = 20 + (56.88/100)*60 = 54`
- run: `20 - 54 = -34`, absDelta=34 → **should fire** as high severity perf_exceeds
- power: `25 - 57 = -32`, absDelta=32 → **should fire** as high severity perf_exceeds
- But this athlete has **no HIE snapshot** (no sessions). Need to trigger hie-analyze to verify patterns generate.

### Test 6: False Positive Check
- Test with tool_grade=65, composite mapped=62, delta=3 → must NOT fire
- Test with tool_grade=70, composite mapped=67, delta=3 → must NOT fire
- Add to `engine-invariants.test.ts` as Test 80

### Test 7: Cross-Test Row Selection
- Athlete `95de827d` has 3 vault test rows. The query (line 1376-1382) takes `ORDER BY test_date DESC LIMIT 1`
- Need to confirm which row is "latest" and that its tool_grades are what's being used
- Query: `SELECT id, test_date, tool_grades FROM vault_performance_tests WHERE user_id = '95de827d...' ORDER BY test_date DESC LIMIT 1`

---

## Implementation

### Step 1: Query production data to complete traces
- Verify which vault test row is selected as "latest" for target athlete
- Run hie-analyze 3× and compare outputs (determinism)
- Trigger hie-analyze for athlete `57b007e3` and check if tool_gap fires

### Step 2: Add engine invariant tests (Tests 80–84)
**File: `src/test/engine-invariants.test.ts`**

| Test | What it proves |
|------|---------------|
| 80 | Delta < 15 produces zero patterns (false positive guard) |
| 81 | Delta = 15 produces exactly one pattern at medium severity |
| 82 | Delta ≥ 20 produces pattern at high severity |
| 83 | Null tool grades return empty array |
| 84 | Null composite values skip that mapping (partial data safety) |

These tests call the pure `analyzeToolPerformanceGaps` function directly — but since it's inside the edge function, we'll replicate the logic as a local test utility (same as Tests 77-79 already do with `generateMetric`).

### Step 3: Run all 84 tests
Confirm full green across all layers including new threshold/false-positive tests.

### Step 4: Report final production trace
For each verified athlete, show complete chain:
```
tool_grades → mapped composites → deltas → patterns → sort position → prescription impact
```

---

## Files

| File | Change |
|------|--------|
| `src/test/engine-invariants.test.ts` | Add Tests 80–84 (threshold, false positive, null safety) |
| No edge function changes | Verification only, no logic modifications |
| No DB changes | Queries only |

