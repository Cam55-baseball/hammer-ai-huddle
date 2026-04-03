

# Final Lock: Prescription Dedup + Verification Script

## Current State

- **Snapshots**: Already uses `upsert` on `(user_id, sport)` — only 1 snapshot per athlete per sport. No accumulation. ✅
- **weakness_scores**: Already uses DELETE-before-INSERT — deduped. ✅
- **drill_prescriptions**: Accumulation risk exists. New prescriptions are filtered by `truly_new` (line 1613-1614), checking `existingAreas`. But if the same weakness_area reappears across runs with slightly different descriptions, duplicates can occur. Old prescriptions are never cleaned up — they just get `resolved: true` after 5 adherence counts.

---

## Part 1: Prescription Deduplication (Option A — Upsert by user_id + targeted_metric)

**In `hie-analyze/index.ts`**, replace the current insert logic (lines 1612-1617):

**Current:**
```typescript
const existingAreas = new Set((existingPrescriptions ?? []).map((e: any) => e.weakness_area));
const truly_new = newPrescriptions.filter(p => !existingAreas.has(p.weakness_area));
if (truly_new.length > 0) {
  await supabase.from('drill_prescriptions').insert(truly_new);
}
```

**New approach:**
1. For each new prescription, check if an active (unresolved) prescription exists for the same `(user_id, targeted_metric)`
2. If yes → UPDATE the existing row with new drill details, reset `adherence_count` to 0, update `pre_weakness_value`
3. If no → INSERT new row
4. This ensures exactly 1 active prescription per targeted_metric per athlete

**Implementation:**
```typescript
for (const np of newPrescriptions) {
  const existing = (existingPrescriptions ?? []).find(
    (e: any) => e.targeted_metric === np.targeted_metric && !e.resolved
  );
  if (existing) {
    // Update existing prescription with latest drill data
    await supabase.from('drill_prescriptions').update({
      drill_name: np.drill_name,
      module: np.module,
      constraints: np.constraints,
      constraints_json: np.constraints_json,
      drill_id: np.drill_id,
      pre_weakness_value: np.pre_weakness_value,
      pre_score: np.pre_score,
      updated_at: new Date().toISOString(),
    }).eq('id', existing.id);
  } else {
    await supabase.from('drill_prescriptions').insert(np);
  }
}
```

**Migration needed:** Add `updated_at` column to `drill_prescriptions` (if not present) for tracking when a prescription was last refreshed.

---

## Part 2: Snapshot Consistency

Already guaranteed — `upsert` on `(user_id, sport)` at line 1644-1646. No changes needed.

---

## Part 3: Permanent Verification Script

Create `supabase/functions/hie-verify/index.ts` — a callable edge function that runs 8 checks and returns a structured PASS/FAIL report.

**Checks:**
1. **HIE Run Success** — Invoke `hie-analyze` for a given athlete, confirm 200 response
2. **weakness_scores Integrity** — Query count per user_id, verify no user has more rows than pattern count (max ~10)
3. **Prescription Correctness** — All active prescriptions have non-null `targeted_metric`; each `targeted_metric` exists in `weakness_scores`
4. **Effectiveness Integrity** — Prescriptions with both `pre_weakness_value` and `post_weakness_value` have a computed `effectiveness_score`
5. **Constraint Enforcement** — All prescriptions have `constraints` field populated (non-empty string)
6. **Fallback Logic** — Prescriptions exist even for athletes with no AI engine response (drill_name populated)
7. **Continuation Token** — Query `audit_log` for `nightly_mpi_continuation` entries, verify structure
8. **Cross-Athlete Isolation** — SQL join confirms no `drill_prescriptions.user_id != weakness_scores.user_id` matches on same `targeted_metric`

**Output format:**
```json
{
  "timestamp": "...",
  "athlete_id": "...",
  "results": [
    { "check": "weakness_scores_integrity", "status": "PASS", "detail": "4 rows, no duplicates" },
    { "check": "prescription_correctness", "status": "FAIL", "detail": "1 prescription missing targeted_metric" }
  ],
  "overall": "PASS"
}
```

---

## Part 4: Regression Protection

Add defensive guards in `hie-analyze`:

1. **Column existence validation** — Before inserting prescriptions, validate required fields are present in the object (targeted_metric, drill_name, user_id). Log and skip any malformed entries.
2. **Error surfacing** — The catch block at line 1653 already logs to `audit_log` with action `hie_analyze_failure`. Confirm prescription-engine failures are also logged (they are, via console.error at line ~1398).
3. **Insert validation wrapper** — Wrap prescription inserts in try/catch with per-row error logging so one bad row doesn't kill the batch.

---

## Files Modified/Created

| File | Change |
|------|--------|
| `supabase/functions/hie-analyze/index.ts` | Replace insert logic with upsert-by-metric; add insert validation guards |
| `supabase/functions/hie-verify/index.ts` | New verification edge function |
| `supabase/config.toml` | Add `[functions.hie-verify]` entry |
| Migration | Add `updated_at` column to `drill_prescriptions` if missing |

## Implementation Order

1. Migration: Add `updated_at` to `drill_prescriptions`
2. Update `hie-analyze` prescription save logic (upsert by metric)
3. Add insert validation guards in `hie-analyze`
4. Create `hie-verify` edge function
5. Add config.toml entry
6. Run verification against test athlete to confirm PASS

