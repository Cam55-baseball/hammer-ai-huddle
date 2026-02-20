
# Instant Optimistic Custom Activity Appearance on Game Plan

## Root Cause

When a user saves a new custom activity, the card appears on the Game Plan after a multi-step delay:

1. `CustomActivityBuilderDialog` calls `createTemplate()` in `useCustomActivities`
2. `createTemplate()` inserts the DB record, optionally inserts the log, then sets `localStorage.customActivityCreated`
3. `useGamePlan` polls that localStorage key every **1 second** in a `setInterval`
4. When found, it calls `fetchTaskStatus()` — a massive function that re-queries 15+ separate database tables sequentially (quizzes, workouts, videos, nutrition, tracking records, etc.)
5. Only after all those queries complete does `customActivities` update and the card appear

This total round-trip is 3–6 seconds in normal conditions, leading users to assume the save failed and create duplicates.

## Solution: Optimistic Update + Targeted Partial Refresh

Instead of waiting for a full `fetchTaskStatus()` re-run, inject the new activity into the Game Plan's `customActivities` state **instantly** while a lightweight background refresh confirms the DB state.

### What Changes

#### 1. `src/hooks/useGamePlan.ts` — Add optimistic injection + targeted refresh

**Add a new exported function `addOptimisticActivity(activity: CustomActivityWithLog)`** that:
- Immediately appends the new activity to the `customActivities` state array
- The card appears on screen in ~0ms

**Add a new exported function `refreshCustomActivities()`** that:
- Queries **only** `custom_activity_templates` and `custom_activity_logs` (the two tables that changed)
- Applies the same skip/schedule filtering already in `fetchTaskStatus()`
- Replaces `customActivities` state with the DB-truth result
- This is the "confirm" phase that runs after the optimistic update

This avoids re-running the 15+ table queries just because a custom activity was created.

#### 2. `src/hooks/useCustomActivities.ts` — Remove localStorage flag

The `localStorage.setItem('customActivityCreated', ...)` line and the corresponding polling in `useGamePlan` are dead weight once optimistic updates are in place. They are removed to simplify the codebase and eliminate the 1-second polling interval.

#### 3. `src/components/GamePlanCard.tsx` — Wire the optimistic path

The `onSave` callback for `CustomActivityBuilderDialog` is updated:

**Before (current):**
```
result = await createTemplate(data, scheduleForToday)
if (result) refetch()  // triggers full 15-table re-query
```

**After:**
```
result = await createTemplate(data, scheduleForToday)
if (result) {
  // 1. Instant: inject into game plan UI immediately
  addOptimisticActivity({
    template: result,
    log: scheduleForToday ? { completed: false, ... } : undefined,
    isRecurring: result.recurring_active,
    isScheduledForToday: scheduleForToday || result.recurring_days.includes(todayDayOfWeek)
  })
  // 2. Background: confirm with lightweight DB refresh
  refreshCustomActivities()
}
```

The "Schedule for Today" toggle in the builder already defaults to **on** in a reasonable UX — but no change is made to the toggle itself, only to how fast the result is reflected.

### Files Changed

| File | Change |
|---|---|
| `src/hooks/useGamePlan.ts` | Add `addOptimisticActivity()` + `refreshCustomActivities()` functions; remove localStorage polling interval; expose both from the return object |
| `src/hooks/useCustomActivities.ts` | Remove `localStorage.setItem('customActivityCreated', ...)` line (polling no longer needed) |
| `src/components/GamePlanCard.tsx` | Update `onSave` handler to call `addOptimisticActivity` + `refreshCustomActivities` instead of `refetch()` |

### User Experience After Fix

1. User taps **Save** in the builder
2. Dialog closes immediately (existing behaviour — already instant)
3. The new activity card **appears on the Game Plan within ~50ms** — before any network round-trip completes — via the optimistic state update
4. ~500ms later, the lightweight `refreshCustomActivities()` DB query completes and confirms/reconciles the state (user never notices this unless there was a save failure, which already shows a toast error)

### No Changes To

- The "Schedule for Today" toggle UI — it already exists and works correctly
- The save/insert logic — DB operations remain unchanged
- Skip/schedule filtering logic — `refreshCustomActivities` reuses the exact same filter code
- Any other Game Plan features (quizzes, workouts, tracking, etc.)
