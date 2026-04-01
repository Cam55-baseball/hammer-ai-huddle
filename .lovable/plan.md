# Unify Scheduling: Zero Fragmentation

## Problem

The app has **two independent scheduling engines** that query overlapping data sources with different logic:

1. `**useGamePlan**` (1391 lines) — Builds today's task list by independently querying `custom_activity_templates`, `custom_activity_logs`, `calendar_skipped_items`, `game_plan_task_schedule`, `scheduled_practice_sessions`, `activity_folders`, and applies its own day-of-week filtering.
2. `**useCalendar**` (1002 lines) — Builds the calendar view by querying the same tables plus `athlete_events`, `calendar_events`, `vault_meal_plans`, `game_plan_skipped_tasks`, and `calendar_day_orders`.

These two hooks do NOT share state. When a user skips a task in Game Plan, the Calendar may not reflect it (and vice versa). When a recurring custom activity is modified, both hooks re-query independently with slightly different filtering logic. The result: missed events, ghost events, and inconsistent state.

### Specific Fragmentation Points


| Data                       | Game Plan reads from                                 | Calendar reads from                                            | Conflict?                                        |
| -------------------------- | ---------------------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------ |
| Custom activity days       | `template.recurring_days` + `calendar_skipped_items` | `template.recurring_days` + `template.display_days`            | Yes — different fallback logic                   |
| System task days           | `TRAINING_DEFAULT_SCHEDULES` (hardcoded)             | `game_plan_task_schedule` table + `TRAINING_DEFAULT_SCHEDULES` | Yes — Game Plan ignores DB schedules for display |
| Date-specific skips        | `game_plan_skipped_tasks` (NOT queried)              | `game_plan_skipped_tasks` (queried and filtered)               | Yes — Game Plan doesn't filter by date skips     |
| Athlete events (game/rest) | NOT queried                                          | Queried from `athlete_events`                                  | Yes — Game Plan doesn't know about game days     |
| Scheduled practices        | Queried independently                                | Queried independently                                          | Duplicate queries, possible drift                |


## Solution: Shared Scheduling Core

### New file: `src/hooks/useUnifiedSchedule.ts`

A single hook that:

1. Queries ALL scheduling tables once (the union of what both hooks need)
2. Builds a normalized `ScheduledEvent[]` array for any date range
3. Exposes helper functions: `getEventsForDate(date)`, `isTaskScheduledForDate(taskId, date)`, `getSkipState(taskId, date)`
4. Uses React Query with a shared cache key so both Game Plan and Calendar read from the same data
5. Subscribes to Realtime on all relevant tables for instant cross-component sync

```text
┌─────────────────────────────────┐
│     useUnifiedSchedule          │
│  (single query + cache layer)   │
│                                 │
│  Sources:                       │
│  - game_plan_task_schedule      │
│  - calendar_skipped_items       │
│  - game_plan_skipped_tasks      │
│  - custom_activity_templates    │
│  - custom_activity_logs         │
│  - athlete_events               │
│  - calendar_events              │
│  - scheduled_practice_sessions  │
│  - activity_folders + items     │
│  - vault_meal_plans             │
│  - sub_module_progress          │
│  - calendar_day_orders          │
│  - TRAINING_DEFAULT_SCHEDULES   │
├─────────────────────────────────┤
│  Consumers:                     │
│  ├── useGamePlan (today only)   │
│  ├── useCalendar (date range)   │
│  └── GamePlanCalendarView       │
└─────────────────────────────────┘
```

### Changes to existing files

`**src/hooks/useGamePlan.ts**`

- Unify and coordinate all independent scheduling queries (templates, logs, skips, scheduled sessions, folder items) with the major schedules of game plan and calendar. Nothing Independent
- Import `useUnifiedSchedule` and call `getEventsForDate(today)` to get today's items
- Keep task-building logic (the `tasks.push(...)` section) but source completion status and visibility from the unified layer
- Keep completion toggling and optimistic updates (these are write operations, not scheduling reads)

`**src/hooks/useCalendar.ts**`

- Remove the 600-line `fetchEventsForRange` function that independently queries all tables
- Import `useUnifiedSchedule` and call `getEventsForRange(start, end)` to get calendar events
- Keep `addEvent`, `updateEvent`, `deleteEvent` (write operations) and have them invalidate the shared cache
- Keep sorting/ordering logic (date-specific locks, weekly locks)

`**src/hooks/useCalendarSkips.ts**`

- Keep as a write-only hook for modifying skip state
- After any mutation, invalidate the unified schedule cache key
- Remove its own Realtime subscription (unified hook handles it)

`**src/hooks/useSystemTaskSchedule.ts**`

- Keep as a write-only hook for saving schedule preferences
- After `saveSchedule()`, invalidate the unified schedule cache key
- Remove independent `fetchSchedules()` for read — reads come from unified hook

`**src/hooks/useRescheduleEngine.ts**`

- Keep all write operations (skipDay, pushForward, etc.)
- `invalidateAll()` already invalidates both calendar and gameplan queries — add the unified cache key

`**src/hooks/useAthleteEvents.ts**`

- Keep `createEvent`, `deleteEvent` write operations
- After mutations, invalidate unified schedule cache
- Remove independent `fetchEvents` for read — reads flow through unified hook

### Key implementation details

- **React Query cache key**: `['unified-schedule', user.id]` — single source of truth
- **Realtime channels**: One channel subscribing to changes on `calendar_skipped_items`, `game_plan_skipped_tasks`, `game_plan_task_schedule`, `custom_activity_templates`, `athlete_events`, `calendar_events`, `scheduled_practice_sessions`
- **Stale time**: 30 seconds (data changes infrequently, Realtime handles instant updates)
- **The unified query function** fetches all tables in a single `Promise.all` (same pattern as current `useCalendar.fetchEventsForRange` but with the Game Plan's filtering logic merged in)
- **Custom activity filtering**: Use the Game Plan's logic (check `calendar_skipped_items` FIRST as single source of truth, then fall back to template settings) — this is the correct logic that Calendar was missing

### What does NOT change

- No database schema changes needed
- No new tables or migrations
- All write operations stay in their current hooks
- UI components continue to use `useGamePlan` and `useCalendar` — they just get consistent data now
- `GamePlanCalendarView`, `CalendarDaySheet`, `CalendarView` components unchanged

## Files


| File                                 | Action                                                                   |
| ------------------------------------ | ------------------------------------------------------------------------ |
| `src/hooks/useUnifiedSchedule.ts`    | **Create** — shared scheduling data layer                                |
| `src/hooks/useGamePlan.ts`           | **Modify** — remove independent scheduling queries, consume unified hook |
| `src/hooks/useCalendar.ts`           | **Modify** — remove independent fetching, consume unified hook           |
| `src/hooks/useCalendarSkips.ts`      | **Modify** — invalidate unified cache on mutations                       |
| `src/hooks/useSystemTaskSchedule.ts` | **Modify** — invalidate unified cache on mutations                       |
| `src/hooks/useRescheduleEngine.ts`   | **Modify** — add unified cache key to `invalidateAll()`                  |
| `src/hooks/useAthleteEvents.ts`      | **Modify** — invalidate unified cache on mutations                       |
