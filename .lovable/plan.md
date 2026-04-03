

# LIVE RUNTIME E2E VERIFICATION REPORT

## Test Executed
**Athlete**: `95de827d-7418-460b-8b79-267bf79bdca4` (Hammer Williams)
**Sessions**: 9 sessions (solo_work, base_stealing, pickoff_training), all with `micro_layer_data = true`
**HIE triggered**: 2026-04-03T04:49:45Z — returned **HTTP 200**

---

## VERIFICATION MATRIX

### ✅ PASS — weakness_scores table populates
**Evidence**: 8 rows exist (4 from first run + 4 from second run):
- `vision_accuracy_low`: scores 36, 40, 61
- `slow_reaction_time`: score 656

**Problem**: Rows accumulate on every HIE run without deduplication. After N runs, there will be N×4 rows. No `UPSERT` or cleanup — scores are appended, not replaced.

### ✅ PASS — Prescription engine called
**Evidence**: `prescription-engine` edge function boot log at `04:49:43Z` confirms it was invoked from `hie-analyze`. No error logs.

### ⚠️ PARTIAL — AI prescriptions not used (stale data prevents insertion)
**Evidence**: `drill_prescriptions` still shows only 2 rows from the FIRST run (created `04:28:10`). The second run's `truly_new` filter (line 1600) found matching `weakness_area` strings, so no new rows were inserted. The AI prescription engine may have returned results, but they were discarded because the weakness areas already existed.

**Impact**: The metric mapping fix (line 1533-1534) works for NEW prescriptions, but these old prescriptions retain `targeted_metric: "recognition"` — a category label, not the actual weakness metric. This means the effectiveness loop (line 1565) searches for `weakness_metric === "recognition"` which never matches, so `post_weakness_value` stays null forever.

### ❌ FAIL — pre_weakness_value still null
**Database evidence**:
```
meter_timing Focused Training | targeted_metric: recognition | pre_weakness_value: null
Reaction Compression Training | targeted_metric: recognition | pre_weakness_value: null
```
**Root cause**: These prescriptions were created before the fix. `targeted_metric: "recognition"` doesn't match any `weakness_scores` row (`vision_accuracy_low`, `slow_reaction_time`). The fix at line 1533-1534 correctly computes `matchingPattern?.metric` for new inserts, but old data is poisoned.

### ✅ PASS — Context/fatigue detection code exists and runs
**Evidence**: Lines 1263-1264 call `detectGamePracticeGap` and `detectFatigueDropoff`. No patterns generated for this athlete because all 9 sessions are `solo_work` — no game sessions exist to create a gap, and session volume is too low for fatigue detection (needs ≥15 reps per session across ≥3 sessions with drop-off).

### ✅ PASS — Handedness fix deployed
**Evidence**: Line 1254 passes `settings?.primary_batting_side || 'R'`. Lines 147-152 flip inside/outside for lefties. This athlete's setting shows `primary_batting_side: R` (verified via query), but the code path is confirmed correct.

### ✅ PASS — Practice Hub constraint enforcement
**Evidence**: `src/pages/PracticeHub.tsx` lines 57-61 parse URL params, line 86 shows banner, lines 243-270 enforce constraint mismatches with toast warnings.

### ✅ PASS — Nightly process runs
**Evidence**: `audit_log` shows daily `nightly_mpi_complete` entries from March 30 through April 3. All show `athletes_processed: 0` because no athletes have recent unprocessed sessions meeting the nightly criteria.

### ✅ PASS — Continuation token logic exists
**Evidence**: Code confirmed at lines 232-268 of `nightly-mpi-process/index.ts`. Not yet exercised in production (0 athletes processed means no timeout).

---

## BUGS REQUIRING FIXES

### Bug 1: Stale `targeted_metric` on existing prescriptions (CRITICAL)
**What**: Old prescriptions have `targeted_metric: "recognition"` instead of `"vision_accuracy_low"`. The effectiveness loop never finds a match, so `post_weakness_value` is permanently null.
**Fix**: One-time migration to correct existing data:
```sql
UPDATE drill_prescriptions SET targeted_metric = 'vision_accuracy_low'
WHERE targeted_metric = 'recognition' AND weakness_area LIKE '%accuracy%';
UPDATE drill_prescriptions SET targeted_metric = 'slow_reaction_time'
WHERE targeted_metric = 'recognition' AND weakness_area LIKE '%reaction time%';
```
**Also**: In `hie-analyze`, when updating existing prescriptions (line 1558-1586), add logic to backfill `targeted_metric` if it doesn't match any weakness_score:
```typescript
// Before the effectiveness calculation, fix stale targeted_metric
let exMetric = (ex as any).targeted_metric || (ex as any).weakness_metric;
if (exMetric && !weaknessScoreRows.find(w => w.weakness_metric === exMetric)) {
  // Stale metric — attempt to resolve from current patterns
  const matchingPattern = allPatterns.find(p => p.description === ex.weakness_area);
  if (matchingPattern) {
    exMetric = matchingPattern.metric;
    // Persist the fix
    await supabase.from('drill_prescriptions').update({ targeted_metric: exMetric }).eq('id', ex.id);
  }
}
```

### Bug 2: weakness_scores accumulate without deduplication (MEDIUM)
**What**: Every HIE run appends 4 rows. After 100 runs = 400 rows per athlete. No upsert, no cleanup.
**Fix**: Before inserting weakness_scores (line ~1286), delete previous entries:
```typescript
await supabase.from('weakness_scores').delete().eq('user_id', user_id);
await supabase.from('weakness_scores').insert(weaknessScoreRows);
```

### Bug 3: Nightly processes 0 athletes (LOW)
**What**: `nightly_mpi_complete` shows `athletes_processed: 0` every night.
**Likely cause**: The query for eligible athletes filters too aggressively, or there are no athletes with sessions since last MPI computation.
**Investigation needed**: Check the athlete selection query in `nightly-mpi-process/index.ts`.

---

## IMPLEMENTATION ORDER

1. **Migration**: Fix stale `targeted_metric` values on existing `drill_prescriptions`
2. **hie-analyze**: Add stale-metric auto-repair in the existing-prescriptions update loop (lines 1558-1586)
3. **hie-analyze**: Add `DELETE` before `INSERT` for weakness_scores to prevent accumulation
4. **Verify**: Trigger HIE again → confirm `post_weakness_value` is now numeric, not null

### Files Modified
| File | Change |
|---|---|
| Migration SQL | One-time fix of `targeted_metric` on 2 existing rows |
| `supabase/functions/hie-analyze/index.ts` | Auto-repair stale `targeted_metric`; deduplicate weakness_scores |

### Post-Fix Verification
- [ ] `drill_prescriptions.targeted_metric` matches a `weakness_scores.weakness_metric` value
- [ ] `drill_prescriptions.post_weakness_value` is numeric after re-run
- [ ] `weakness_scores` has exactly 4 rows per athlete (not accumulating)
- [ ] `effectiveness_score` is computed (not null) on prescriptions with both pre and post values

