

# Fix didStrength Logic + Restore Program Session Merging

## Problem
Two critical regressions in current recap logic:
1. **`didStrength` is wrong** (line 641): Uses `totalWorkouts + combinedStrengthSessions > 0` — but `totalWorkouts` counts ALL `vault_workout_notes` rows, not just strength. A user with only cardio logged could falsely get "did strength training."
2. **Program strength sessions dropped** (line 631): `combinedStrengthSessions = customStrengthSessions` ignores program workouts entirely, regressing prior unification.

Plus 2 small upgrades: expand keyword list, add volume threshold to confidence scoring.

## Changes — `supabase/functions/generate-vault-recap/index.ts`

### 1. Derive `programStrengthSessions` from `vault_workout_notes`
After line 194, add:
```typescript
// A program workout counts as strength if it logged weight OR reported weight increases
const programStrengthSessions = workouts?.filter(w => 
  (w.total_weight_lifted || 0) > 0 || 
  (Array.isArray(w.weight_increases) && w.weight_increases.length > 0)
).length || 0;
```

### 2. Fix session merging (line 631)
Replace:
```typescript
const combinedStrengthSessions = customStrengthSessions;
```
With true union (program rows and custom logs are different tables — IDs cannot overlap, so a sum is the correct set-union size):
```typescript
const combinedStrengthSessions = programStrengthSessions + customStrengthSessions;
```

### 3. Fix `didStrength` (line 641)
Replace:
```typescript
const didStrength = (totalWorkouts + combinedStrengthSessions) > 0;
```
With evidence-based check:
```typescript
const didStrength = combinedStrengthSessions > 0 || customVolumeLbs > 0 || totalWeightLifted > 0;
```

### 4. Expand strength keywords (line 536)
Add real-world abbreviations: `'db','bb','ohp','incline','decline','chin','lat','tricep','bicep','glute','hamstring','quad','calf'` to `STRENGTH_KEYWORDS`.

### 5. Refine confidence scoring (line 635)
Replace flat 0.6 with tiered:
```typescript
if (customVolumeLbs > 1000) confidenceScore += 0.6;
else if (customVolumeLbs > 0) confidenceScore += 0.4;
if (programStrengthSessions > 0) confidenceScore += 0.2; // new signal
if (strengthExerciseCount > 5) confidenceScore += 0.2;
if (customActivitiesWithStrength.size > 2) confidenceScore += 0.2;
```
(Cap implicit via thresholds; `>= 0.8` high / `>= 0.4` medium retained.)

### 6. Update prompt + stored stats to expose `program_strength_sessions`
- In `workout_stats` storage block, add `program_strength_sessions: programStrengthSessions`.
- In AI prompt section showing strength counts, replace the "Custom Strength Sessions Detected" line with two lines:
  - `Program Strength Sessions: ${programStrengthSessions}`
  - `Custom Strength Sessions: ${customStrengthSessions}`
  - `Combined Strength Sessions: ${combinedStrengthSessions}`

### 7. Note on `totalWeightLifted` semantics
`vault_workout_notes.total_weight_lifted` is already a per-workout aggregate (treated as volume in existing logic). No rename needed, but add a code comment near line 194 clarifying: `// per-workout aggregate volume from program workouts`.

## Files

| File | Change |
|------|--------|
| `supabase/functions/generate-vault-recap/index.ts` | Add `programStrengthSessions`, fix `didStrength`, fix session merge, expand keywords, tier confidence, expose new field in prompt + stats |

## Out of Scope
- Parsing reorder (nice-to-have, current order works for `"3x8 @ 185"` since each pattern is independent)
- Renaming `totalWeightLifted` (would ripple through stored recap shape)

