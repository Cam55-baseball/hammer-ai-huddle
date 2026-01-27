
# Fix: Repeat Weekly Deselection Not Hiding Activities from Game Plan

## Problem Identified

When you deselect days in the "Repeat Weekly" settings for a custom activity, the schedule drawer correctly:
1. Saves skip days to `calendar_skipped_items` table (the single source of truth)
2. Updates the display text showing which days are selected

However, the activity still appears on deselected days because `useGamePlan.ts` does NOT check the `calendar_skipped_items` table when determining which custom activities to include.

## Root Cause

In `src/hooks/useGamePlan.ts` (lines 413-434), the logic checks:
- `template.recurring_days` (stored on the template itself)
- `template.display_days` (fallback)

But it IGNORES the `calendar_skipped_items` table, which is supposed to be the **single source of truth** for weekly scheduling.

The `GamePlanCard.tsx` component does have a secondary filter (`isWeeklySkipped`) but by that point, the activities have already been added to the list by `useGamePlan`, so they still appear.

## Solution

Modify `useGamePlan.ts` to:
1. Fetch the user's `calendar_skipped_items` data
2. Check if today's day is in the skip list for each custom activity
3. Only include activities that are NOT skipped for today

---

## Technical Changes

### File: `src/hooks/useGamePlan.ts`

**Change 1: Add skip items fetch (around line 400)**

Fetch the skip data from `calendar_skipped_items` alongside templates and logs:

```typescript
// Fetch skip days from calendar_skipped_items (SINGLE SOURCE OF TRUTH)
const { data: skipItemsData } = await supabase
  .from('calendar_skipped_items')
  .select('item_id, skip_days')
  .eq('user_id', user.id)
  .eq('item_type', 'custom_activity');

const skipItemsMap = new Map<string, number[]>();
(skipItemsData || []).forEach(item => {
  skipItemsMap.set(item.item_id, item.skip_days || []);
});
```

**Change 2: Update the filtering logic (lines 413-434)**

Check the skip items map when determining if an activity should appear today:

```typescript
templates.forEach(template => {
  // Check display settings first
  if (template.display_on_game_plan === false) return;
  
  // Check calendar_skipped_items first (SINGLE SOURCE OF TRUTH)
  const itemId = `template-${template.id}`;
  const skipDays = skipItemsMap.get(itemId) || [];
  const isSkippedToday = skipDays.includes(todayDayOfWeek);
  
  // If explicitly skipped for today via calendar settings, don't include
  if (isSkippedToday) {
    // Still check if there's a log for today - if user already logged, show it
    const todayLog = logs.find(l => l.template_id === template.id);
    if (!todayLog) return; // Skip this activity entirely
  }
  
  // Fallback to template settings if no skip record exists
  const scheduledDays = template.recurring_active 
    ? (template.recurring_days as number[]) || []
    : (template.display_days as number[] | null) || [0, 1, 2, 3, 4, 5, 6];
  
  const isScheduledToday = scheduledDays.includes(todayDayOfWeek);
  const todayLog = logs.find(l => l.template_id === template.id);
  
  // Include if: (scheduled AND not skipped) OR has a log for today
  if ((isScheduledToday && !isSkippedToday) || todayLog) {
    customActivitiesForToday.push({
      template,
      log: todayLog,
      isRecurring: template.recurring_active || false,
      isScheduledForToday: (isScheduledToday && !isSkippedToday) || !!todayLog,
    });
  }
});
```

---

## Data Flow After Fix

```text
User deselects Monday in Repeat Weekly
           ↓
TemplateScheduleSettingsDrawer saves skip_days: [1] to calendar_skipped_items
           ↓
useGamePlan fetches calendar_skipped_items
           ↓
On Monday: skipDays.includes(1) = true → activity NOT added to list
           ↓
Game Plan shows no activity on Monday ✓
```

## Files Modified

| File | Change |
|------|--------|
| `src/hooks/useGamePlan.ts` | Add calendar_skipped_items fetch and filter logic |

## Edge Cases Handled

1. **Activity with existing log**: If user already logged the activity today (before deselecting), it will still appear (so they don't lose their data)
2. **No skip record**: Falls back to template's `recurring_days`/`display_days` for backward compatibility
3. **Real-time sync**: The existing real-time subscription in `useCalendarSkips` will trigger refetches when skip data changes
