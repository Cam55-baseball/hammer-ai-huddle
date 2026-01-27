
# Fix: System Tasks Ignoring Repeat Weekly Schedule

## Problem

The Morning Check-In (`quiz-morning`) and Pre-Workout Check-In (`quiz-prelift`) are marked as "Scheduled off" in the schedule settings but still appear on the Game Plan. The database confirms:
- `quiz-morning` has `skip_days: [1, 2]` (Monday, Tuesday skipped)
- `quiz-prelift` has `skip_days: [1]` (Monday skipped)
- Today is Monday (day 1), so both should be hidden

## Root Cause

In `useGamePlan.ts`, the skip items fetch only queries for `item_type = 'custom_activity'`:

```typescript
const { data: skipItemsData } = await supabase
  .from('calendar_skipped_items')
  .select('item_id, skip_days')
  .eq('user_id', user.id)
  .eq('item_type', 'custom_activity'); // ← Only fetches custom activities!
```

System tasks (`quiz-morning`, `quiz-prelift`, `quiz-night`, etc.) use `item_type = 'game_plan'` but this data is never fetched or used when building the tasks list.

## Solution

Modify `useGamePlan.ts` to:
1. Fetch skip items for BOTH `custom_activity` AND `game_plan` types
2. Check system tasks against the skip list before adding them to the tasks array

---

## Technical Changes

### File: `src/hooks/useGamePlan.ts`

**Change 1: Expand skip items query to include game_plan type**

Replace the single query with one that fetches both types:

```typescript
// Fetch skip days from calendar_skipped_items (SINGLE SOURCE OF TRUTH)
// Include BOTH custom_activity and game_plan types
const { data: skipItemsData } = await supabase
  .from('calendar_skipped_items')
  .select('item_id, skip_days, item_type')
  .eq('user_id', user.id)
  .in('item_type', ['custom_activity', 'game_plan']);

const skipItemsMap = new Map<string, number[]>();
(skipItemsData || []).forEach(item => {
  skipItemsMap.set(item.item_id, item.skip_days || []);
});
```

**Change 2: Store skip map in state for use in task building**

The skip map needs to be available when building the tasks array (which happens in the component body, not in the async function). Add state and update it:

```typescript
const [gamePlanSkips, setGamePlanSkips] = useState<Map<string, number[]>>(new Map());
```

And in fetchTaskStatus:
```typescript
setGamePlanSkips(skipItemsMap);
```

**Change 3: Create helper to check if system task is skipped today**

```typescript
const isSystemTaskSkippedToday = (taskId: string): boolean => {
  const skipDays = gamePlanSkips.get(taskId) || [];
  const todayDayOfWeek = getDay(new Date()); // 0=Sun, 1=Mon, etc.
  return skipDays.includes(todayDayOfWeek);
};
```

**Change 4: Apply skip logic when adding system tasks**

Wrap each system task addition with a skip check:

```typescript
// Morning Check-In
if (hasAnyModuleAccess && !isSystemTaskSkippedToday('quiz-morning')) {
  tasks.push({
    id: 'quiz-morning',
    // ... rest of task config
  });
}

// Pre-Workout Check-In  
if (isStrengthDay && (hasHittingAccess || hasPitchingAccess) && !isSystemTaskSkippedToday('quiz-prelift')) {
  tasks.push({
    id: 'quiz-prelift',
    // ... rest of task config
  });
}

// Night Check-In
if (hasAnyModuleAccess && !isSystemTaskSkippedToday('quiz-night')) {
  tasks.push({
    id: 'quiz-night',
    // ... rest of task config
  });
}
```

**Change 5: Apply same logic to ALL other schedulable system tasks**

Apply the skip check to all tasks that can be scheduled via calendar:
- `workout-hitting`, `workout-pitching` (program type)
- `video-hitting`, `video-pitching`, `video-throwing`
- `texvision`, `mindfuel`, `healthtip`
- Any other tasks that have scheduling controls

---

## Data Flow After Fix

```text
User deselects Monday for "Morning Check-In"
           ↓
TemplateScheduleSettingsDrawer saves skip_days: [1] to calendar_skipped_items
           ↓
useGamePlan fetches ALL skip items (both custom_activity and game_plan)
           ↓
gamePlanSkips map contains: { 'quiz-morning': [1], 'quiz-prelift': [1] }
           ↓
On Monday: isSystemTaskSkippedToday('quiz-morning') = true
           ↓
Morning Check-In NOT added to tasks array
           ↓
Game Plan shows no Morning Check-In on Monday ✓
```

---

## Summary

| Task | Current Behavior | After Fix |
|------|-----------------|-----------|
| Quiz-Morning (Mon skipped) | Shows on Monday | Hidden on Monday |
| Quiz-Prelift (Mon skipped) | Shows on Monday | Hidden on Monday |
| Custom Activities | Already fixed | No change needed |
| Other system tasks | No skip support | Will respect schedules |

This fix ensures the `calendar_skipped_items` table is the **single source of truth** for ALL schedulable items, not just custom activities.
