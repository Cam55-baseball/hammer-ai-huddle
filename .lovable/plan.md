

# Stress Test & Edge Case Verification — Executable Plan

## What This Delivers
A comprehensive stress test script that exercises 6 scenarios against the live `hie-analyze` edge function and database, producing a pass/fail report with database evidence for each case.

## Approach
Execute all 6 scenarios via direct edge function calls (`supabase--curl_edge_functions`) and database queries (`supabase--read_query`), using the existing test athlete and crafting specific inputs to trigger each edge case.

---

## Scenario 1: No micro_layer_data
**Method**: Call `hie-analyze` for athlete `95de827d...` after confirming sessions exist. The function already handles empty `micro_layer_data` arrays — `hittingReps.length < 5` returns `[]` from each analyzer (line 60). When `allPatterns` is empty, fallback to MPI composites (lines 1324-1341).
**Verify**: Returns 200, snapshot has MPI-based weakness clusters, no crash.

## Scenario 2: AI Prescription Engine Failure
**Method**: The code already wraps the prescription-engine call in try/catch (lines 1396-1398). If the engine returns non-200 or throws, `aiPrescriptions` stays `[]` and the fallback switch runs (lines 1419-1428). We verify this by checking edge function logs after a run — if prescription-engine errors, hie-analyze still completes.
**Verify**: Confirm hie-analyze returns 200 even when prescription-engine logs show errors. Check that `prescriptive_actions` in snapshot is populated via fallback.

## Scenario 3: Continuation Token (Nightly Interrupted Run)
**Method**: The nightly process reads `resume_from` from `audit_log` (action: `nightly_mpi_continuation`). We verify the token logic exists and query the audit_log for continuation entries.
**Verify**: Query `audit_log` for `nightly_mpi_continuation` entries. Confirm code at nightly-mpi-process lines 232-268 persists `resume_from` on timeout.
**Note**: Cannot simulate mid-run interruption without modifying edge function code (adding artificial timeout). This is a code-path verification, not a live interruption test.

## Scenario 4: Multi-Athlete Isolation
**Method**: Query all athletes with `hie_snapshots` and `weakness_scores`. Verify each athlete's `weakness_scores` rows reference only their own `user_id`. Cross-check that no `drill_prescriptions` reference a different athlete's weakness data.
**Verify**: SQL query confirming no cross-contamination:
```sql
SELECT user_id, COUNT(*) FROM weakness_scores GROUP BY user_id;
SELECT dp.user_id AS prescription_user, ws.user_id AS score_user
FROM drill_prescriptions dp
JOIN weakness_scores ws ON dp.targeted_metric = ws.weakness_metric
WHERE dp.user_id != ws.user_id;
```

## Scenario 5: Longitudinal Integrity (Multiple HIE Cycles)
**Method**: Trigger HIE twice for the same athlete. After each run, query `weakness_scores` count (should be exactly N patterns, not 2×N due to DELETE-before-INSERT at lines 1287-1293). Check `adherence_count` increments by 1 per run on existing prescriptions.
**Verify**:
- `weakness_scores` count stable (not doubling)
- `adherence_count` on existing prescriptions increments correctly
- `effectiveness_score` populated where both pre and post values exist

## Scenario 6: Legacy Data (null pre_weakness_value)
**Method**: Query existing prescriptions with null `pre_weakness_value`. Confirm system doesn't crash — the effectiveness loop handles null gracefully at line 1582-1585 (`preVal != null` guard). Falls back to MPI delta at line 1589.
**Verify**: Prescriptions with null `pre_weakness_value` still get `effectiveness_score` via MPI fallback. No errors in logs.

---

## Implementation Steps

1. **Query current database state** — baseline counts for weakness_scores, drill_prescriptions, hie_snapshots
2. **Trigger HIE run #1** for test athlete via `curl_edge_functions`
3. **Query post-run state** — verify weakness_scores dedup, prescription updates, snapshot creation
4. **Trigger HIE run #2** — same athlete, verify no duplication, adherence increments
5. **Query cross-athlete isolation** — SQL joins to detect contamination
6. **Query legacy prescriptions** — confirm null handling doesn't break
7. **Check edge function logs** — confirm no crashes, fallback paths logged
8. **Compile pass/fail report** with database evidence for each scenario

## Files Modified
None. This is a read-only verification pass using edge function invocations and database queries.

## Expected Output
A verification matrix with PASS/FAIL per scenario, backed by query results and log evidence.

