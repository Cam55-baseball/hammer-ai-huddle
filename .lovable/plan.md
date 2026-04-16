

# Fix 6-Week Recap: Custom Activity Strength Detection

## Problem
The recap edge function fetches custom activity exercise data but **never extracts weight values** from those exercises. The `totalWeightLifted` metric (line 194) only counts `vault_workout_notes`. When a user lifts weights exclusively through custom activities, the recap reports "0 lbs lifted" and the AI may conclude "no strength training occurred."

## Root Cause (3 specific gaps)

1. **Weight extraction missing**: Lines 525-549 iterate custom activity exercises and count sets/reps/type distribution, but skip `ex.weight` entirely
2. **Strength detection is type-based**: No logic checks for actual weight data or bodyweight exercise keywords
3. **Combined stats never computed**: `workout_stats.total_weight` only reflects program workouts — custom activity weight is invisible to the AI prompt and stored stats

## Solution — Single File Change

**File**: `supabase/functions/generate-vault-recap/index.ts`

### 1. Add Activity Insights extraction (after line 549)

Inside the existing custom activity exercise loop (lines 531-549), extract weight and compute volume:

```typescript
// Track weight from exercises
let customWeightLbs = 0;
let customVolumeLbs = 0;
let strengthExerciseCount = 0;
const BODYWEIGHT_KEYWORDS = ['push-up','pull-up','dip','plank','lunge','squat','burpee','sit-up','crunch'];
const STRENGTH_KEYWORDS = ['bench','squat','deadlift','press','curl','row','fly','raise','shrug','extension'];
```

For each exercise:
- If `ex.weight` exists, convert kg→lbs if needed, add to `customWeightLbs`
- Compute `volume = sets × reps × weight` → add to `customVolumeLbs`
- If weight > 0 OR exercise name matches strength/bodyweight keywords → increment `strengthExerciseCount`
- Parse free-text notes for weight patterns: `(\d+)\s?(lbs|lb|kg)`

### 2. Add combined strength metrics

After the custom activity analysis block, compute:

```typescript
const combinedWeightLifted = totalWeightLifted + customWeightLbs;
const combinedStrengthSessions = totalWorkouts + strengthExerciseCount > 0 
  ? customActivities.filter(hasStrengthExercises).length : 0;
const hasDetectedStrength = combinedWeightLifted > 0 || strengthExerciseCount > 0;
const strengthConfidence = customWeightLbs > 0 ? 'high' : strengthExerciseCount > 0 ? 'medium' : 'low';
```

### 3. Update AI prompt (section 1, line 998-1004)

Replace the training volume section to show combined data:

```
1. TRAINING VOLUME & PROGRESSION
   • Program Workouts: ${totalWorkouts}
   • Custom Strength Sessions Detected: ${combinedStrengthSessions}
   • Combined Weight Lifted: ${combinedWeightLifted.toLocaleString()} lbs 
     (Program: ${totalWeightLifted} | Custom: ${customWeightLbs})
   • Custom Volume Load: ${customVolumeLbs.toLocaleString()} lbs (sets × reps × weight)
   • Strength Detection Confidence: ${strengthConfidence}
```

Add a mandatory AI instruction:

```
STRENGTH DETECTION RULE:
- If combinedWeightLifted > 0: "Athlete performed strength training" (confident)
- If strengthExerciseCount > 0 but no weight: "Strength exercises detected (bodyweight/unweighted)"
- If neither: "No structured strength training detected in this period"
- NEVER say "did not lift weights" if custom exercises include strength-type movements
```

### 4. Update fallback executive summary (line 930)

Change the non-AI fallback from:
```
"You completed ${totalWorkouts} workouts... lifting ${totalWeightLifted} lbs"
```
To:
```
"You completed ${totalWorkouts + combinedStrengthSessions} training sessions... 
 combined volume of ${combinedWeightLifted.toLocaleString()} lbs"
```

### 5. Update stored `workout_stats` (line 1440-1446)

Add combined fields:

```typescript
workout_stats: {
  total_workouts: totalWorkouts,
  total_weight: totalWeightLifted,
  custom_weight: customWeightLbs,
  combined_weight: combinedWeightLifted,
  custom_volume_load: customVolumeLbs,
  strength_sessions_detected: combinedStrengthSessions,
  strength_confidence: strengthConfidence,
  // ... existing fields
}
```

### 6. Update exercise analysis in prompt (section 13, line 1102-1107)

Add weight tracking line:

```
• Total Weight Logged in Custom Exercises: ${customWeightLbs.toLocaleString()} lbs
• Total Volume Load (sets × reps × weight): ${customVolumeLbs.toLocaleString()} lbs
• Strength Exercises Detected: ${strengthExerciseCount} (via weight data or exercise keywords)
```

## Files

| File | Change |
|------|--------|
| `supabase/functions/generate-vault-recap/index.ts` | Extract weight from exercises, compute combined metrics, update prompt + stats |

## What This Does NOT Change
- No UI changes needed — the recap card already renders whatever the AI returns
- No database schema changes — `recap_data` is a JSON column
- No type changes — stored stats are untyped JSON

