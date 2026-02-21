

# Deep Custom Field Analysis + Custom Activity Load Integration

## What's Changing

### Problem 1: Custom Field Analysis is Shallow
Currently, the 6-week recap only counts how many custom fields exist and whether checkboxes were checked. It ignores the actual **values** users enter -- sets completed, reps logged, weights used, time recorded, and text notes in custom fields. The AI just sees "Custom Fields Logged: 5 unique fields tracked" with no detail.

### Problem 2: Custom Activities Don't Feed Load Tracking
When you complete a custom workout card (e.g., a Cam Williams profile card with exercises), that training data is invisible to the daily CNS load tracker, overlap warnings, and recovery recommendations. Only program workouts currently count.

---

## Plan

### Part 1: Deep Custom Field Analysis in 6-Week Recap

Update the `generate-vault-recap` edge function to extract **actual values** from `performance_data`, not just completion counts:

- For **checkbox** fields: Keep completion tracking (done/not done)
- For **number** fields: Extract values and compute min/max/average across the period (e.g., "Sprint Time: avg 4.2s, best 3.9s")
- For **text** fields: Collect the actual text entries and pass them to the AI for pattern analysis
- For **time** fields: Extract durations and compute trends

The AI prompt section on custom fields will be expanded from a single line ("Custom Fields Logged: 5") to a detailed breakdown showing the athlete's actual recorded data, enabling the AI to make specific, data-driven observations like "Your Shower Stretch completion rate was 85% -- strong consistency" or "Your sprint times improved from 4.5s to 4.1s over the period."

### Part 2: Custom Activity Load Integration

When a custom activity containing exercises is completed, calculate its CNS and fascial load contribution and add it to the daily `athlete_load_tracking` record:

- Reuse the existing load calculation logic from the `calculate-load` edge function
- Add a client-side hook that triggers after custom activity completion
- Map custom activity exercise types to CNS/fascial load values (strength, plyometric, cardio, etc.)
- This means overlap warnings and recovery recommendations will now account for ALL training

---

## Technical Details

### Files Modified

1. **`supabase/functions/generate-vault-recap/index.ts`** (lines ~616-638, ~1018-1024)
   - Expand custom field analysis to extract actual values from `performance_data` by field type
   - Build a detailed per-field breakdown: checkbox completion rates, numeric value ranges/averages, text entries, time trends
   - Update the AI prompt Section 13 to include this granular data instead of just a count

2. **`src/hooks/useLoadTracking.ts`**
   - Add a new `addCustomActivityLoad` method that calculates CNS/fascial/volume load from a custom activity template's exercises
   - Reuse the same CNS calculation logic as `calculate-load` (base by exercise type + volume modifier)

3. **`src/hooks/useCustomActivities.ts`** (or wherever activity completion is handled)
   - After marking a custom activity as completed, call `addCustomActivityLoad` with the template's exercises
   - Only add load for activity types that have exercises (workout, practice, short_practice, warmup)

4. **`src/hooks/useGamePlan.ts`** (completion handler)
   - Same integration point for Game Plan card completions -- trigger load tracking update

### Load Calculation for Custom Activities

The load formula will mirror the existing `calculate-load` edge function logic:
- **Strength** exercises: base CNS 30, modified by volume (sets x reps)
- **Plyometric**: base CNS 40
- **Cardio**: base CNS 20
- **Baseball/Core**: base CNS 25/10
- Fascial bias: strength = compression, plyometric = elastic, flexibility = glide
- Volume = total sets x reps across all exercises

This runs client-side to avoid an extra edge function call on every completion, using the same formulas for consistency.
