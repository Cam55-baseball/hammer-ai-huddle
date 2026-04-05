

# Fix 6 Unresolved Verification Gaps

## 1. Effectiveness Engine — Direction Normalization (L1764)

**Problem**: `effectiveness_score = pre_weakness_value - currentWS.score` assumes all metrics are "lower = better." For `vision_accuracy_low`, the *value* stored is the accuracy % (e.g., 36). If accuracy improves from 36→55, the score goes UP, producing `36 - 55 = -19` (negative = regression). But this is actually improvement.

**Fix**: Add a direction map at the top of the effectiveness block. Metrics where a higher score = worse (reaction time, tool gaps) keep the current formula. Metrics where a higher score = better (accuracy) flip the sign.

```typescript
const HIGHER_IS_WORSE: Set<string> = new Set([
  'slow_reaction_time', 'fatigue_dropoff', 'chase_rate_high',
  'practice_game_gap',
]);
// For vision_accuracy_low, the VALUE is the accuracy %, so higher = better
// For tool_gap_*, the VALUE is abs(delta), so higher = worse
// Default: treat metric value as "higher = worse" (most weakness scores)

// At L1764:
if (preVal != null) {
  const higherIsWorse = HIGHER_IS_WORSE.has(exMetric) || exMetric.startsWith('tool_gap_');
  effectivenessScore = higherIsWorse
    ? preVal - currentWS.score   // lower score = improvement = positive
    : currentWS.score - preVal;  // higher score = improvement = positive
}
```

**File**: `supabase/functions/hie-analyze/index.ts` ~L1756-1765

**Invariant Test 85**: Insert `vision_accuracy_low` with pre=36, post=55 → effectiveness must be +19 (positive = improvement).

---

## 2. Pattern Disappearance — Max Improvement on Missing Post

**Problem**: When a pattern disappears between HIE runs (e.g., `tool_gap_run_physical` no longer fires because delta dropped below 15), the effectiveness block finds no matching `weakness_score` → `currentWS` is undefined → `effectivenessScore` stays null → no learning signal recorded.

**Fix**: At L1759, when `currentWS` is not found but `pre_weakness_value` exists, treat as full resolution:

```typescript
if (currentWS) {
  postWeaknessValue = currentWS.score;
  // ... existing effectiveness calc
} else if (preVal != null) {
  // Pattern resolved — no longer detected
  postWeaknessValue = 0;
  effectivenessScore = preVal; // max improvement
}
```

**File**: `supabase/functions/hie-analyze/index.ts` ~L1759-1766

**Invariant Test 86**: pre_weakness_value=17, no matching post score → effectiveness_score = 17.

---

## 3. Continuation Token — Add `resumed_from` to Nightly Response

**Problem**: The nightly function returns `{ success: true }` with no indication of `resumeFrom`. The completion audit log also doesn't record it. There's no way to verify resume actually happened.

**Fix**: 
- Add `resumed_from` to the `nightly_mpi_complete` audit log metadata (L892-901)
- Add a `nightly_mpi_batch_start` audit log entry at the start of the batch loop (after L250) logging the first `batchStart`
- Return `resumed_from` in the response body (L920)

```typescript
// After L250, before first batch:
await supabase.from('audit_log').insert({
  user_id: '00000000-0000-0000-0000-000000000000',
  action: 'nightly_mpi_batch_start',
  table_name: 'mpi_scores',
  metadata: { sport, batch_start: resumeFrom, total_athletes: athletes.length },
});

// L892 metadata: add resumed_from: resumeFrom
// L920 response: add resumed_from: resumeFrom
```

**File**: `supabase/functions/nightly-mpi-process/index.ts` ~L250, L892, L920

Then update `hie-verify-continuation/index.ts` to check:
- Read `nightly_mpi_batch_start` audit log
- Confirm `batch_start === 2` (the injected `resume_from`)

---

## 4. Context Engine — Session Type Integrity Check

**Problem**: `_session_type` is attached at L1415 from `s.session_type`. If any ingestion path writes sessions without `session_type`, it defaults to `'personal_practice'` (L1412). This is safe but unverified.

**Fix**: Add an invariant test that:
1. Simulates micro reps with mixed session types
2. Confirms `_session_type` is present on every rep after the spread
3. Confirms default fallback to `personal_practice` when session_type is null/undefined

**Invariant Test 87**: Mock 3 sessions (game, practice, null type) with micro reps → verify all reps have `_session_type`, null defaults to `personal_practice`.

---

## 5. Effectiveness Causality — Isolation Note

The previous test inserted TEX drill results AND the system ran a full recompute. The vision patterns changed because `analyzeTexVisionResults` (L420-470) reads `tex_vision_drill_results` directly — independent of session aggregation. This is already isolated by design: TEX patterns come from `tex_vision_drill_results`, not `performance_sessions.composite_indexes`. No additional test needed — but we'll add an invariant test confirming TEX patterns are computed from `tex_vision_drill_results` only.

**Invariant Test 88**: Confirm TEX vision analysis function signature takes drill results array, not session composites.

---

## 6. Tool Gap Resolution — Full Trace via Code

The tool_gap disappeared because after inserting improved TEX drill data, the HIE recompute changed the weakness_scores set. The tool grades and MPI composites did NOT change (no new vault tests or sessions were added). So the delta remains the same. The disappearance was caused by the top-5 pattern slice changing — not by delta resolution.

This means the tool_gap pattern IS still generated but may have been pushed out of the stored weakness_scores if more than 5 patterns now exist. We need to verify the write logic at L1462 — it stores ALL patterns, not just top 5.

Looking at L1462: `weaknessScoreRows = allPatterns.map(...)` — this maps ALL patterns. So tool_gap should still be in weakness_scores. The "disappearance" reported earlier was likely a query issue. We'll add a verification query in the test suite.

---

## Summary of Changes

| File | Changes |
|------|---------|
| `supabase/functions/hie-analyze/index.ts` | (1) Add direction map for effectiveness sign normalization at L1764. (2) Add pattern-resolved fallback at L1759. |
| `supabase/functions/nightly-mpi-process/index.ts` | (3) Add `nightly_mpi_batch_start` audit log entry. Add `resumed_from` to completion log and response. |
| `supabase/functions/hie-verify-continuation/index.ts` | (3) Check `nightly_mpi_batch_start` log to prove `batch_start === resume_from`. |
| `src/test/engine-invariants.test.ts` | Add Tests 85-88: direction normalization, pattern resolution, session type integrity, TEX isolation. |

