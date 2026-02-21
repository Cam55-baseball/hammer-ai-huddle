

# Year-Round Training: Continuous Looping + Smart Progression

## Overview

When a user finishes Cycle 4 of Iron Bambino or Heat Factory, the program currently shows "Program Complete!" and dead-ends. This plan makes all three programs (Iron Bambino, Heat Factory, Speed Lab) run year-round with no endpoint, adding intelligent volume auto-adjustment based on biological readiness and progressive weight suggestions.

---

## What Changes

### 1. Cycle Looping (Iron Bambino + Heat Factory)

When Cycle 4 / Week 6 is completed, the program loops back to Cycle 1 with:
- A `loops_completed` counter incremented (tracks how many full 24-week passes)
- Week progress, exercise progress, and day completion times reset (fresh start)
- **Weight log preserved** -- carried forward so the system knows your history
- Streak and total workout counts continue uninterrupted
- A celebratory toast: "Loop 2 starting -- let's keep building!" instead of "Program Complete!"

### 2. Progressive Weight Suggestions

A new utility function analyzes the user's `weight_log` history to suggest weights for the next loop:
- Looks at the same exercise from the previous loop's equivalent workout day
- Suggests a small increase (2.5-5 lbs / ~2-5%) based on readiness score
- If readiness is low (recovery_focus), suggests the **same** weight or slightly less
- If readiness is moderate (modify_volume), suggests same weight
- If readiness is good (full_send), suggests a progressive increase
- Displayed as a subtle hint next to weight input fields: "Last loop: 135 lbs -- Try 140?"

### 3. Auto-Adjust Volume Based on Biological Readiness

The existing `ReadinessFromVault` system already calculates readiness scores and produces recommendations (`full_send`, `modify_volume`, `recovery_focus`). This plan wires that into the workout display:
- **full_send** (score >= 75): Normal prescribed volume
- **modify_volume** (score 50-74): Show a banner suggesting "Drop 1 set per compound exercise" and visually dim the last set
- **recovery_focus** (score < 50): Show a banner suggesting "Reduce to 60% intensity, skip plyometrics" with affected exercises flagged

This uses the existing `suggest-adaptation` edge function and `ReadinessFromVault` component -- no new AI calls needed.

### 4. Speed Lab -- No Changes

Speed Lab already has no built-in progression endpoint. Confirmed: no cycle/loop logic exists for it. No changes needed.

---

## Technical Details

### Database Migration

Add a `loops_completed` column to `sub_module_progress`:

```sql
ALTER TABLE sub_module_progress 
ADD COLUMN IF NOT EXISTS loops_completed integer DEFAULT 0;
```

### File Changes

**`src/hooks/useSubModuleProgress.ts`** (core changes):
- Remove the `TOTAL_CYCLES` cap from `advanceToCycle` (remove `newCycle > TOTAL_CYCLES` guard)
- In `checkAndAdvanceCycle`: when `currentCycle >= 4`, loop back to cycle 1 instead of showing "Program Complete!"
  - Increment `loops_completed`
  - Reset week/exercise/day progress but **keep** `weight_log`
  - Show loop celebration toast
- Add `loops_completed` to the `SubModuleProgress` interface and fetch/init logic
- Add a `getWeightSuggestion(exerciseIndex, currentWeek, currentDay)` function that:
  - Looks up the same exercise's weight from the previous loop (or previous cycle)
  - Applies a readiness-based multiplier (1.0x, 1.02x, or 0.95x)

**`src/components/workout-modules/DayWorkoutDetailDialog.tsx`**:
- Accept and display weight suggestions next to weight input fields
- Show a readiness-based volume adjustment banner at the top when readiness is not `full_send`

**`src/components/workout-modules/WeeklyWorkoutPlan.tsx`**:
- Display the current loop number (e.g., "Loop 2 -- Cycle 3, Week 4") in the header when loops > 0

**`src/types/workout.ts`** (if needed):
- Add `loops_completed` to any relevant type interfaces

### Existing Infrastructure Leveraged
- `ReadinessFromVault` component and `calculateReadinessScore` function (already built)
- `suggest-adaptation` edge function (already built, already returns volume/intensity suggestions)
- `weight_log` JSONB field (already stores per-exercise, per-set weights across weeks)
- `athlete_load_tracking` table (already tracks CNS load for readiness context)

