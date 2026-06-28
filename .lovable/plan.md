## Goal
Give users a one-tap way to mark a game, tournament, camp, or practice as **Canceled** or **Rescheduled**, and make Hammer's daily plan respect that status immediately (so a canceled tournament day stops triggering taper/game-day modulation).

## Changes

### 1. Status vocabulary (no schema change required)
- `games.status` already exists. Standardize three values used by the UI:
  - `scheduled` (default)
  - `canceled`
  - `rescheduled` (kept on its original date as a tombstone; a new event is created on the new date)
- For non-game events stored in `calendar_events` / `custom_activity_logs`, add a lightweight `status` flag via `performance_data.status` (no migration) so the same UI works across event types.

### 2. New component `src/components/calendar/EventStatusMenu.tsx`
- Dropdown shown on any game/tournament/practice row inside `CalendarDaySheet` and on Hammer's "Today" event chips.
- Options: **Mark canceled**, **Reschedule…**, **Restore to scheduled**.
- "Reschedule…" opens a date picker; on confirm:
  - Sets original row `status = 'rescheduled'`, stores `rescheduled_to` date in metadata.
  - Inserts a new `games` (or calendar event) row on the new date with `status = 'scheduled'` and a `rescheduled_from` pointer.

### 3. Hook `src/hooks/useEventStatusMutation.ts`
- `setStatus({ eventId, kind, status })` — writes to the right table (`games` vs `calendar_events` vs `custom_activity_logs`).
- `reschedule({ eventId, kind, newDate })` — two-step: mark original `rescheduled`, insert new row.
- Invalidates `calendar-projection`, `game-day-context`, `season-status`, `hammer-daily-plan`.

### 4. Schedule-context awareness
- Extend `src/hooks/useScheduleWindow.ts` to filter out events where `status in ('canceled','rescheduled')` when computing the active window.
- `scheduleContext.ts` (`SchedulePosture`) will therefore stop applying game/taper/tournament postures for canceled days automatically — no logic change needed beyond the filter.

### 5. Visual treatment
- Canceled events render struck-through with a muted "Canceled" badge in `CalendarView` and `HammerDailyPlan`.
- Rescheduled events show a small arrow → new date.

## Out of scope
- No schema migration (uses existing `status` column + JSON metadata).
- No notification/email flow for cancellations.
- No bulk "cancel whole tournament" action (single-event cancel only; multi-day tournaments would be canceled per day for now — easy to add later).

## Technical notes
- Original-date tombstone (`rescheduled`) preserves replay/lineage — required by the project's additive-only event doctrine.
- All writes go through the existing scheduling realtime channel, so other tabs update live.
