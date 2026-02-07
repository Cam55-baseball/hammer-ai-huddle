
# Smart Default Scheduling for Training Modules

## Problem

Iron Bambino, Heat Factory, and Speed Lab all default to showing **7 days per week** on the Game Plan and Calendar. This contradicts sports science, the app's own 12-hour lockout timers, and the recovery-first philosophy. Athletes see training tasks every day even on days they should rest. There is no system-level "recommended schedule" that the app applies automatically.

## Solution

Introduce **intelligent default schedules** for each training module that kick in when a user has no custom `game_plan_task_schedule` row for that task. Users can still override via "Repeat Weekly" settings. The defaults reflect professional training periodization.

---

## 1. Recommended Default Schedules

| Module | Task ID | Default Days | Days/Week | Reasoning |
|--------|---------|-------------|-----------|-----------|
| Iron Bambino | `workout-hitting` | Mon, Tue, Thu, Fri, Sat | 5 | Matches 5-day workout structure (D1-D5) with Wed+Sun rest |
| Heat Factory | `workout-pitching` | Mon, Tue, Thu, Fri, Sat | 5 | Same 5-day structure, mirrors Iron Bambino |
| Speed Lab | `speed-lab` | Mon, Wed, Fri | 3 | Sprint training needs 48h CNS recovery between sessions |

These defaults apply ONLY when the user has NOT set a custom schedule via the "Repeat Weekly" drawer.

---

## 2. Implementation: Default Schedule Map

A new constant in `useGamePlan.ts` and `useCalendar.ts` defines the recommended schedule for each training task:

```text
const TRAINING_DEFAULT_SCHEDULES: Record<string, number[]> = {
  'workout-hitting':  [1, 2, 4, 5, 6],  // Mon, Tue, Thu, Fri, Sat
  'workout-pitching': [1, 2, 4, 5, 6],  // Mon, Tue, Thu, Fri, Sat
  'speed-lab':        [1, 3, 5],          // Mon, Wed, Fri
};
```

Day values use JavaScript's `getDay()` format: 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat.

---

## 3. Game Plan Changes (`useGamePlan.ts`)

### Current behavior:
Training tasks are added to the Game Plan if:
1. User has module access (`hasHittingAccess`, etc.)
2. Task is not skipped today via `calendar_skipped_items`

There is **no day-of-week check** for training tasks -- they show every day.

### New behavior:
Before adding each training task, check:
1. Does the user have a custom schedule row in `calendar_skipped_items` for this task? If yes, respect that.
2. If no custom schedule exists, check `TRAINING_DEFAULT_SCHEDULES` for today's day of week. Only show the task if today is in the default schedule.

This means **no database changes** are needed -- the default schedule is purely in-code, and the existing `calendar_skipped_items` / `game_plan_task_schedule` system overrides it when the user customizes.

### Code change:

Add a helper function:

```text
const shouldShowTrainingTask = (taskId: string): boolean => {
  // If user has explicit skip days, that takes priority (already handled by isSystemTaskSkippedToday)
  // If user has NO schedule at all, use the smart default
  const hasCustomSchedule = gamePlanSkips.has(taskId);
  if (hasCustomSchedule) return true; // Custom schedule exists, skip-check already handles filtering

  const defaultDays = TRAINING_DEFAULT_SCHEDULES[taskId];
  if (!defaultDays) return true; // No default schedule, show every day

  return defaultDays.includes(todayDayOfWeek);
};
```

Then wrap each training task:

```text
// Iron Bambino
if (hasHittingAccess && !isSystemTaskSkippedToday('workout-hitting') && shouldShowTrainingTask('workout-hitting')) {
  tasks.push({ ... });
}

// Heat Factory
if (hasPitchingAccess && !isSystemTaskSkippedToday('workout-pitching') && shouldShowTrainingTask('workout-pitching')) {
  tasks.push({ ... });
}

// Speed Lab
if (hasThrowingAccess && !isSystemTaskSkippedToday('speed-lab') && shouldShowTrainingTask('speed-lab')) {
  tasks.push({ ... });
}
```

---

## 4. Calendar Changes (`useCalendar.ts`)

### Current behavior:
Module-gated tasks (including `speed-lab`, `video-throwing`) appear on **every day** in the calendar when the user has no explicit `game_plan_task_schedule` row (lines 566-592). Iron Bambino and Heat Factory also appear every day via `sub_module_progress` processing (lines 595-669), defaulting to `scheduledDays = [0,1,2,3,4,5,6]`.

### New behavior:
Apply the same `TRAINING_DEFAULT_SCHEDULES` map when no explicit schedule exists:

**For module-gated tasks** (Speed Lab in `MODULE_GATED_TASKS.throwing`):
When iterating days, check if the task has a default schedule and filter by day-of-week.

**For sub_module_progress** (Iron Bambino / Heat Factory):
Change the fallback from `[0,1,2,3,4,5,6]` to the default schedule:

```text
// Before:
const scheduledDays = programSchedule?.display_days || [0, 1, 2, 3, 4, 5, 6];

// After:
const scheduledDays = programSchedule?.display_days || TRAINING_DEFAULT_SCHEDULES[programTaskId] || [0, 1, 2, 3, 4, 5, 6];
```

---

## 5. First-Day Behavior

### How it starts:
- **Iron Bambino / Heat Factory**: The task appears on the Game Plan the moment the user subscribes to the hitting/pitching module. No initialization needed -- the subscription gate (`hasHittingAccess`) controls visibility.
- **Speed Lab**: Appears when the user subscribes to the throwing module. The Speed Lab page itself has an "Initialize Journey" step, but the Game Plan task appears regardless and links to `/speed-lab` where the user can initialize.

### After first completion:
- **Iron Bambino / Heat Factory**: After completing Day 1, the 12-hour lockout activates. The task still appears on scheduled days but shows a countdown timer when accessed. No change needed here.
- **Speed Lab**: After completing a session, the 12-hour CNS lockout activates, and the "RECOVERY" badge shows. The task still appears on its scheduled days (Mon/Wed/Fri by default).

---

## 6. User Override

The user can always override the default schedule by:
1. Tapping the pencil icon on any task in the Game Plan
2. Opening the "Repeat Weekly" drawer
3. Selecting custom days

Once a `calendar_skipped_items` row exists for that task, the system uses the custom schedule instead of the default. This is the existing behavior -- no changes needed to the override flow.

---

## Summary of Files Modified

| File | Change |
|------|--------|
| `src/hooks/useGamePlan.ts` | Add `TRAINING_DEFAULT_SCHEDULES` constant and `shouldShowTrainingTask()` helper; wrap 3 training task blocks with the new check |
| `src/hooks/useCalendar.ts` | Add `TRAINING_DEFAULT_SCHEDULES` constant; use it as fallback in module-gated task loops and sub_module_progress processing |

**Total**: 2 files modified, 0 database migrations

---

## E2E Flow

```text
User subscribes to hitting module
  --> Game Plan shows Iron Bambino on Mon/Tue/Thu/Fri/Sat (5 days)
  --> Calendar shows Iron Bambino sessions on the same 5 days
  --> Wed and Sun: no Iron Bambino task (rest days)

User completes Day 1 on Monday
  --> 12-hour lockout starts
  --> Tuesday: task shows, lockout expired, user can do Day 2
  --> Wednesday: no task shown (default rest day)
  --> Thursday: task shows, user does Day 3

User opens "Repeat Weekly" and selects Mon/Wed/Fri
  --> Custom schedule saved to calendar_skipped_items
  --> Default schedule overridden
  --> Game Plan + Calendar now show Mon/Wed/Fri only

User subscribes to throwing module
  --> Speed Lab appears Mon/Wed/Fri (default 3 days/week)
  --> Completes session Monday, 12-hour lockout
  --> Wednesday: lockout expired, task appears, user sprints
  --> Tuesday/Thursday/Saturday/Sunday: no Speed Lab task
```
