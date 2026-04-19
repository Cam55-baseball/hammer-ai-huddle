

# Calendar Module Audit — Findings

This is a diagnostic only. No fixes implemented.

## 1. System Diagram (current state)

```text
                      ┌──────────────────────────────────────────────┐
                      │ calendar_events (table — STORED, mutable)    │◄──┐
                      └──────────────────────────────────────────────┘   │
                                       ▲   ▲   ▲   ▲                    │
   WRITES from many places ────────────┘   │   │   │                    │
   - useCalendar.addEvent/update/delete    │   │   │                    │
   - useSchedulingService                  │   │   │                    │
   - generate-training-block edge fn       │   │   │                    │
   - useTrainingBlock (reschedule mirror)  │   │   │                    │
   - RestDayScheduler                      │   │   │                    │
   - DailyWorkoutPlanner                   │   │   │                    │
   - useRescheduleEngine                   │   │   │                    │
                                                                        │
SOURCES OF TRUTH (also read directly)                                   │
   game_plan_days, custom_activity_logs,                                │
   custom_activity_templates, athlete_events,                           │
   game_plan_task_schedule, sub_module_progress,                        │
   vault_meal_plans, calendar_day_orders,                               │
   scheduled_practice_sessions,                                         │
   game_plan_skipped_tasks, calendar_skipped_items                      │
                            │                                           │
                            ▼                                           │
   useCalendar.fetchEventsForRange (~700-line aggregator) ──────────────┘
                            │
                            ▼     setEvents(...)  (local React state)
                  CalendarView → CalendarDaySheet
                            │
   Realtime: useSchedulingRealtime invalidates broad query keys
   BUT useCalendar uses local useState, not React Query → invalidation MISSES it.
   Refresh path = useEffect on `lockedDays` only.

NEW (just-built, not wired):
   buildCalendarEvents() + useCalendarProjection() + ['calendar-projection'] key
   → exists but CalendarView still imports the old useCalendar hook.
```

## 2. Verdict

**B) Partially derived, partially stored — fragile.**

The calendar reads from 11 tables AND maintains its own writable `calendar_events` table that is mirrored from at least 5 different code paths. The "derived projection" layer built last round exists but is **not wired into the UI**.

## 3. Issues (prioritized)

### P0 — Causes desync immediately

| # | Issue | Location | Why it desyncs |
|---|---|---|---|
| 1 | **CalendarView still uses legacy `useCalendar`**, not the new `useCalendarProjection` | `src/components/calendar/CalendarView.tsx:24,78` | The new derived layer is dead code from the user's perspective. |
| 2 | **`useCalendar` stores events in `useState`, not React Query** | `useCalendar.ts:877` (`setEvents`) | `useSchedulingRealtime` invalidates query keys (`['calendar']`, etc.) — but `useCalendar` doesn't subscribe to any query key, so realtime invalidation does nothing. Only manual `refetch()` updates it. |
| 3 | **Six independent writers to `calendar_events`** | `useCalendar` (893,915,937), `useSchedulingService` (61,87,112), `RestDayScheduler` (42,77), `DailyWorkoutPlanner` (63), `useTrainingBlock` (313, mirror), `generate-training-block` (704) | Any writer that fails or runs out of order leaves `calendar_events` out of sync with source-of-truth tables (`block_workouts`, `custom_activity_logs`). The "mirror" in `useTrainingBlock` is a classic dual-write race. |
| 4 | **Training block workouts duplicated**: `block_workouts` + mirrored `calendar_events` rows | `generate-training-block/index.ts:692-706` | If a workout is rescheduled in `block_workouts` but the mirror update in `useTrainingBlock:313` fails or is skipped, calendar shows the old date. |

### P1 — Causes drift over time

| # | Issue | Location | Why |
|---|---|---|---|
| 5 | **Recurring template projection only suppresses duplicates if a log exists**; deleted templates with old logs still render via the log row | `useCalendar.ts:367-410` (templates) and `:244-250` (logs) | Logs are joined via `custom_activity_templates(*)` — if template is soft-deleted, log title still renders from the joined row (which is filtered `is('deleted_at', null)` only on the templates query, **not** on the logs join). |
| 6 | **Completion status comes from `custom_activity_logs.completed`** but recurring template projections have no log → always rendered as "not completed" even if `game_plan_days.is_completed=true` | `useCalendar.ts:398-410` | Day-level completion isn't propagated to projected template events. |
| 7 | **Partial day completion is never represented** | n/a | No code path computes `partial`. The new builder added this; the legacy hook does not. |
| 8 | **Realtime subscription on `block_workouts` lacks user filter** (table has no `user_id`) | `useSchedulingRealtime.ts:177` | Every user receives every other user's workout events. Cheap noise now, but invalidates all clients on every block update. |

### P2 — Architectural smells

| # | Issue | Location |
|---|---|---|
| 9 | `useCalendar` is 977 lines and aggregates 11 sources inline — no single deterministic builder until last round's `buildCalendarEvents`. | `useCalendar.ts` |
| 10 | `calculate-regulation` and `useNightCheckInStats` read from `calendar_events` for "what's scheduled tomorrow" — they will silently go stale if we stop writing to that table. | `calculate-regulation/index.ts:106`, `useNightCheckInStats.ts:91` |
| 11 | `useRescheduleEngine` reads/writes `calendar_events` exclusively; if the table becomes derived, the reschedule UX breaks. | `useRescheduleEngine.ts:48,94,121,134` |

## 4. Edge-case behavior (current)

| Scenario | Current behavior | Why |
|---|---|---|
| Complete a custom activity | Calendar updates only after manual `refetch()` or page nav. Realtime invalidation hits the wrong store. | Issue #2 |
| Delete a custom activity template | Future projections disappear (templates query filters `deleted_at`). **Past logs still render** with stale title. | Issue #5 |
| Edit a template title | Recurring projections update on next fetch. Past logs still show old title (joined data is current though, so partially OK). | Mostly OK |
| Reschedule a training-block workout | `block_workouts.scheduled_date` updates; mirror update on `calendar_events` **may or may not run** (best-effort, no transaction). | Issue #3, #4 |
| Archive an active block | `block_workouts` rows remain; `calendar_events` mirror rows remain. Nothing deletes them. Calendar shows ghost workouts. | Issue #3 |
| Partial day (1 of 3 logs done) | Day shows mixed event states; no `partial` flag. | Issue #7 |

## 5. Failure points / race conditions

1. **Dual-write race**: `useTrainingBlock` updates `block_workouts` then `calendar_events`. Two awaits, no transaction. Network failure between them ⇒ permanent drift.
2. **Realtime → `useState` gap**: `useSchedulingRealtime` invalidates React Query keys; `useCalendar` doesn't use them. Realtime silently no-ops for the calendar UI.
3. **Edge function vs client writes**: `generate-training-block` inserts `calendar_events` server-side; client may have already cached an older view. No conflict resolution.
4. **`block_workouts` realtime has no user filter** ⇒ broadcast storms across users.
5. **Soft-deleted template + lingering log** ⇒ orphan events persist.

## 6. Where the new derived layer stands

`src/lib/calendar/buildCalendarEvents.ts` and `src/hooks/useCalendarProjection.ts` were created last round. They are **correct and idempotent** (10 tests pass per prior summary), but **nothing imports them**. They are dead code until `CalendarView` is swapped over and the legacy writers are decommissioned.

## 7. Output summary

- **Architecture verdict**: B (partially derived, fragile).
- **Root cause of inaccuracy**: split-brain between `calendar_events` (stored, multi-writer) and source-of-truth tables, plus realtime invalidating query keys the calendar hook doesn't use.
- **Highest-leverage fix order** (for a future plan):
  1. Swap `CalendarView` to `useCalendarProjection` (kills issues #1, #2, #6, #7 in one move).
  2. Stop writing to `calendar_events` from `generate-training-block` and `useTrainingBlock` mirror (kills #3, #4).
  3. Migrate `useRescheduleEngine`, `RestDayScheduler`, `DailyWorkoutPlanner` to source-of-truth tables (kills remaining #3).
  4. Update `calculate-regulation` and `useNightCheckInStats` to read from source-of-truth tables (kills #10).
  5. Add `user_id` JOIN-side filter for `block_workouts` realtime (kills #8).
  6. Drop `calendar_events`, `calendar_skipped_items` (calendar-side), `calendar_day_orders` after soak.

