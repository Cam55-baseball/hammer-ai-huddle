

# Harden Custom Activity Strength Logic — 8 Fixes

## Summary
Fix metric inflation, session double-counting, weak parsing, and AI hallucination risk in the recap edge function. All changes in one file.

**File**: `supabase/functions/generate-vault-recap/index.ts`

## Changes

### 1. Fix Weight vs Volume (lines 531-534, 580-584)
Replace `customWeightLbs` accumulation with `customTopWeightLbs` (tracks max single-exercise weight, not inflated sum):

```typescript
let customTopWeightLbs = 0;  // replaces customWeightLbs
let customVolumeLbs = 0;
```

In the exercise loop, replace `customWeightLbs += exWeightLbs * sets` with:
```typescript
customTopWeightLbs = Math.max(customTopWeightLbs, exWeightLbs);
customVolumeLbs += exWeightLbs * sets * (reps || 1);
```

### 2. Fix Session Double-Counting (line 610)
Replace `totalWorkouts + customStrengthSessions` with `Set`-based dedup. Since program workouts are a separate table (no overlap possible with custom activity IDs), the real fix is to NOT blindly sum — only count custom sessions that aren't already program workouts. Use:
```typescript
const combinedStrengthSessions = totalWorkouts + customStrengthSessions;
```
→ Replace with just `customStrengthSessions` for the custom side, keeping program workouts separate:
```typescript
// Program workouts are ALL strength by definition in this app
// Custom strength sessions are additive (different IDs, no overlap)
// But label them correctly — don't call totalWorkouts "strength" blindly
const combinedStrengthSessions = customStrengthSessions;
// totalWorkouts stays separate as "program workouts"
```

Actually, reviewing the data: `totalWorkouts` = vault_workout_notes (program workouts). `customStrengthSessions` = custom activities with strength. These are genuinely different tables with no ID overlap, so addition is valid BUT the issue is that `totalWorkouts` includes ALL program workouts (not just strength). We'll keep the sum but rename for clarity in the prompt.

### 3. Upgrade Parsing (lines 537-538, 569-578)
Add `SET_REP_PATTERN` and `AT_WEIGHT_PATTERN` after existing patterns. In the exercise loop, after existing notes parsing, add fallback parsing for `3x8` and `@185` patterns when structured data is missing.

### 4. Normalize Exercise Names (line 588)
Replace `exName.toLowerCase()` with `exName.toLowerCase().replace(/[^a-z0-9 ]/g, '')` to strip punctuation before keyword matching.

### 5. Fix Combined Metrics (line 609)
Replace `combinedWeightLifted = totalWeightLifted + customWeightLbs` with:
```typescript
const combinedVolumeLbs = totalWeightLifted + customVolumeLbs;
```
Update all downstream references from `combinedWeightLifted` → `combinedVolumeLbs`, and from `customWeightLbs` → `customTopWeightLbs`.

### 6. Upgrade Confidence Model (line 611)
Replace simple ternary with scored model:
```typescript
let confidenceScore = 0;
if (customVolumeLbs > 0) confidenceScore += 0.6;
if (strengthExerciseCount > 5) confidenceScore += 0.2;
if (customActivitiesWithStrength.size > 2) confidenceScore += 0.2;
const strengthConfidence = confidenceScore >= 0.8 ? 'high' : confidenceScore >= 0.4 ? 'medium' : 'low';
```

### 7. Add Truth Fields to Stored Data (lines 1522-1535)
Add to `workout_stats`:
```typescript
did_strength: combinedStrengthSessions > 0,
strength_reason: customVolumeLbs > 0 ? 'weight_detected' : strengthExerciseCount > 0 ? 'movement_detected' : 'none',
```
Replace `custom_weight` → `custom_top_weight: customTopWeightLbs`, `combined_weight` → `combined_volume: combinedVolumeLbs`.

### 8. Replace AI Prompt Strength Rule (lines 1400-1412)
Replace with source-of-truth format:
```
STRENGTH DETECTION (SOURCE OF TRUTH):
- did_strength = ${combinedStrengthSessions > 0} → ...
- strength_reason = "${strengthReason}"
- NEVER contradict these fields. Do not infer beyond them.
```

Update prompt section 1 (lines 1062-1067) and section 13 (lines 1169-1177) to use new variable names. Update fallback summary (line 994) similarly.

## Files

| File | Change |
|------|--------|
| `supabase/functions/generate-vault-recap/index.ts` | All 8 fixes: metric correction, parsing upgrade, confidence model, prompt hardening |

