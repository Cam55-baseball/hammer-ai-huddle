

## Step 1 — Wire CalendarView to the Derived Projection Layer (Read-Only Swap)

### Scope
Swap the read path only. Keep every existing write to `calendar_events` untouched. Verify the derived layer renders the same set of events the legacy hook produces, then hand off to manual verification.

### Pre-flight checks (during exploration)
I need to confirm before implementing:
1. The exact shape `CalendarView` (and its children — `CalendarDaySheet`, `AddCalendarEventDialog`) consume from `useCalendar`. The legacy `CalendarEvent` shape vs the new `DerivedCalendarEvent` shape will likely differ — I'll need a small adapter.
2. Whether children call mutation methods (`addEvent`, `updateEvent`, `deleteEvent`, `markComplete`, etc.) directly off the hook return. Those calls must keep working against the legacy hook (writes stay alive); only the rendered event list switches sources.
3. Whether `useCalendarProjection` currently covers every event type the legacy hook surfaces. From the audit, the legacy aggregator pulls from 11 sources; the new builder covers 4 (game_plan_days, custom_activity_logs, custom_activity_templates, training_blocks/block_workouts). Gaps to confirm: `athlete_events`, `scheduled_practice_sessions`, `vault_meal_plans`, `sub_module_progress`, `game_plan_task_schedule`.

### Approach

**A. Coverage parity (MUST do before swap)**
If the projection misses sources the legacy hook renders, the swap will silently drop events. I will:
- Diff the legacy `useCalendar.fetchEventsForRange` source list against `useCalendarProjection`.
- For any missing source that produces user-visible calendar events, extend `buildCalendarEvents` + `useCalendarProjection` to cover it (deterministic IDs, same sort rules).
- If a source is purely cosmetic/unused in the current UI, skip it and note in code.

**B. Hybrid wiring in `CalendarView.tsx`**
- Keep `useCalendar()` mounted to preserve mutation methods (`addEvent`, `updateEvent`, `deleteEvent`, etc.) and any legacy state children depend on.
- Add `useCalendarProjection({ startDate, endDate, sport })` for the rendered event list.
- Build a small adapter `derivedToCalendarEvent(d: DerivedCalendarEvent): CalendarEvent` so downstream components (DaySheet, month grid) keep their existing prop contracts unchanged.
- Replace the `events` array passed to children with the adapted derived events. Mutations still call the legacy hook's methods.

**C. Realtime verification**
`useCalendarProjection` already uses React Query keys `['calendar-projection', ...]`. `useSchedulingRealtime` already invalidates scheduling-related keys. I'll confirm the realtime hook invalidates `['calendar-projection']` specifically (or a prefix that covers it). If not, add the invalidation. No new subscriptions needed — they exist.

**D. Temporary instrumentation**
Add a dev-only `console.debug` block in `useCalendarProjection` that logs per-source counts whenever the projection rebuilds:
```
[calendar-projection] logs=12 templates=4 blockWorkouts=8 gamePlanDays=14 → events=24
```
Gated behind `import.meta.env.DEV` so it ships nothing in prod. Easy to remove after verification.

**E. What stays untouched (explicit)**
- All `calendar_events` inserts/updates/deletes in `useCalendar`, `useSchedulingService`, `useTrainingBlock`, `RestDayScheduler`, `DailyWorkoutPlanner`, `useRescheduleEngine`, `generate-training-block`. Untouched.
- `calendar_events` table. Untouched.
- `useRescheduleEngine`, `useNightCheckInStats`, `calculate-regulation`. Untouched.
- Game Plan, skip semantics, training block generation logic. Untouched.

### Files

**Modified**
- `src/hooks/useCalendarProjection.ts` — add coverage for any missing sources surfaced in pre-flight; add dev counts log.
- `src/lib/calendar/buildCalendarEvents.ts` — extend builder if new sources added. Update tests accordingly.
- `src/lib/calendar/buildCalendarEvents.test.ts` — add tests for any new sources.
- `src/components/calendar/CalendarView.tsx` — mount projection hook, adapter, swap events prop. Keep legacy hook for mutations.
- `src/hooks/useSchedulingRealtime.ts` — confirm/add `['calendar-projection']` invalidation if missing.

**New**
- `src/lib/calendar/adaptDerivedEvent.ts` — small pure adapter `DerivedCalendarEvent → CalendarEvent` (legacy shape) so children stay contract-stable.

**Untouched**
- All write paths. All other consumers of `useCalendar`. Everything in the audit's P1/P2 list.

### Verification (manual after swap)
1. Calendar renders same events as before for current week + ±1 month.
2. Complete a custom activity → event flips to completed within ~1s without page nav.
3. Delete a custom activity template → its future events disappear; past completed logs remain (with current title).
4. Reschedule a training block workout → calendar reflects new date immediately.
5. Open DevTools console → see `[calendar-projection] …` counts log on each rebuild; counts ≈ legacy event count for the same range (within expected delta from de-duplication / partial flag).
6. No console errors. No mutation regressions (Add Event dialog, edit, delete still work via legacy paths).

### Out of scope for Step 1
Removing legacy writes, dropping `calendar_events`, migrating Reschedule Engine / Night Check-in / Regulation reads, adding `user_id` filter to `block_workouts` realtime. All deferred to Steps 2–5.

