

# Fix Calendar ↔ Game Plan Sync: Skipped/Removed Activities Still Showing

## Problem

The calendar has three gaps that cause it to show activities that the user has already skipped, removed, or deleted from their Game Plan:

1. **Weekly skip days ignored**: The Game Plan uses `calendar_skipped_items` as the single source of truth for "which days of the week should this task NOT appear." The calendar **never reads this table**, so tasks skipped on e.g. Tuesdays and Thursdays still show every day.

2. **Deleted custom templates still appear**: Custom activity templates with `deleted_at IS NOT NULL` are not filtered out when the calendar generates recurring events from templates.

3. **Removed-from-Game-Plan templates still appear**: Templates with `display_on_game_plan = false` correctly skip the template-based recurring events, but their existing `custom_activity_logs` still show on the calendar even if the user removed the activity from their plan.

## Changes

### `src/hooks/useCalendar.ts`

**1. Fetch `calendar_skipped_items` alongside existing queries**

Add a new parallel query in `fetchEventsForRange` (around line 293, next to `gamePlanSkipsRes`):

```typescript
supabase
  .from('calendar_skipped_items')
  .select('item_id, item_type, skip_days')
  .eq('user_id', user.id),
```

**2. Build a skip-day lookup map after the fetch**

After the `gamePlanSkipSet` construction (around line 308), build a map from the results:

```typescript
const calendarSkipMap = new Map<string, number[]>();
if (calendarSkipItemsRes.data) {
  calendarSkipItemsRes.data.forEach(skip => {
    calendarSkipMap.set(`${skip.item_type}:${skip.item_id}`, skip.skip_days || []);
  });
}
```

**3. Filter recurring template events using skip days**

In the custom templates loop (line 366), add a skip-day check alongside the existing `recurringDays.includes(dayOfWeek)` check:

```typescript
// Check if this day is skipped via calendar_skipped_items
const templateSkipKey = `custom_activity:template-${template.id}`;
const templateSkipDays = calendarSkipMap.get(templateSkipKey) || [];
if (templateSkipDays.includes(dayOfWeek)) return; // skipped for this weekday
```

**4. Filter system/game-plan tasks using skip days**

In the task schedules loop (line 474), the default daily tasks loop (line 508), and the module-gated tasks section (line 549), add the same check:

```typescript
const skipKey = `game_plan:${taskId}`;
const skipDays = calendarSkipMap.get(skipKey) || [];
if (skipDays.includes(dayOfWeek)) continue;
```

Also apply to program-type tasks in the sub_module_progress loop (line 618):

```typescript
const progSkipKey = `program:${programTaskId}`;
const progSkipDays = calendarSkipMap.get(progSkipKey) || [];
if (progSkipDays.includes(dayOfWeek)) return;
```

**5. Filter out deleted templates**

In the custom templates query (line 238), add `.is('deleted_at', null)` to exclude soft-deleted templates. This prevents deleted activities from generating recurring calendar events.

**6. Consolidate with existing date-specific skip filter**

The existing filter at line 731–744 already handles `game_plan_skipped_tasks` (date-specific skips). The new weekly skip filtering happens earlier during event generation, so both mechanisms work together: weekly skips prevent events from being created, and date-specific skips remove any that slip through.

## Summary of root cause

The Game Plan saves weekly skip schedules to `calendar_skipped_items`, but the calendar never reads that table — it only reads `game_plan_skipped_tasks` (date-specific skips). This single missing query is why skipped activities keep appearing.

## Files affected

| File | Change |
|------|--------|
| `src/hooks/useCalendar.ts` | Add `calendar_skipped_items` query, build skip map, apply filtering to all event generation loops, filter deleted templates |

