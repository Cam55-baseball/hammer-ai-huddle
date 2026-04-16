

# Fix Session Double-Counting + Tighten didStrength

## Changes — `supabase/functions/generate-vault-recap/index.ts`

### 1. Date-level session dedup
Replace `combinedStrengthSessions = programStrengthSessions + customStrengthSessions` with a `Set` of date strings unioning program strength workouts and custom strength activities. A single day with both a program workout and a custom activity now counts as one session.

```typescript
const strengthSessionDates = new Set<string>([
  ...(workouts || [])
    .filter(w =>
      (w.total_weight_lifted || 0) > 0 ||
      (Array.isArray(w.weight_increases) && w.weight_increases.length > 0)
    )
    .map(w => new Date(w.date).toDateString()),
  ...(customActivities || [])
    .filter(a => customActivitiesWithStrength.has(a.id))
    .map(a => new Date(a.date).toDateString())
]);
const combinedStrengthSessions = strengthSessionDates.size;
```

(Will verify exact field names — `w.date` vs `w.workout_date`, `a.date` vs `a.activity_date` — before patching.)

### 2. Threshold-based `didStrength`
Replace permissive OR with meaningful thresholds:
```typescript
const didStrength =
  combinedStrengthSessions > 0 ||
  customVolumeLbs > 500 ||
  totalWeightLifted > 500;
```

### 3. Cap confidence score
After all `confidenceScore +=` additions:
```typescript
confidenceScore = Math.min(confidenceScore, 1);
```

### 4. Update stored stats + AI prompt
- Add `unique_strength_days: combinedStrengthSessions` note in `workout_stats` (keep `program_strength_sessions` and `custom_strength_sessions` as-is for transparency).
- Update prompt strength block to clarify `Combined Strength Sessions` is now date-deduped (unique training days).

## Files

| File | Change |
|------|--------|
| `supabase/functions/generate-vault-recap/index.ts` | Date-set dedup for sessions, threshold gate on didStrength, cap confidence, prompt clarification |

## Out of Scope
- PR detection / progression tracking (future work, enabled by this fix)
- Schema changes

