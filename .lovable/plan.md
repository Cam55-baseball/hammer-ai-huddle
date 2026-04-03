

# Move Session History to Calendar

## Summary
Remove `RecentSessionsList` from Practice Hub and surface session history inside the Calendar Day Sheet. Practice Hub becomes execution-only; Calendar becomes the system of record for reviewing past sessions.

## Changes

### 1. New Hook: `src/hooks/useDaySessions.ts`
- Fetches `performance_sessions` for a given date and user
- Selects lightweight columns only: `id, session_type, module, effective_grade, composite_indexes, drill_blocks, notes, session_date`
- No `micro_layer_data` in list query (performance requirement)
- Query key: `['day-sessions', userId, dateString]`
- `staleTime: 60_000`

### 2. New Component: `src/components/calendar/DaySessionsList.tsx`
- Renders inside `CalendarDaySheet` as a "Practice Sessions" section
- Uses `useDaySessions(date)` to fetch sessions for the selected day
- Each session card shows:
  - Module badge (Hitting, Pitching, etc.)
  - Session type (practice, game, etc.)
  - Session tag from `generateInsights()` with color badge
  - Effective grade with label
- On click → opens `SessionDetailDialog`

### 3. New Component: `src/components/calendar/SessionDetailDialog.tsx`
- Dialog showing full session detail for a clicked session
- Reuses `generateInsights()` to produce Win / Focus / Cue / Key Metrics
- Shows drill blocks summary
- Includes `SessionVideosDisplay` for attached videos
- Shows notes
- Fetches full session data (including any heavy fields) only on open

### 4. Update: `src/components/calendar/CalendarDaySheet.tsx`
- Import and render `DaySessionsList` after the existing event sections (before skipped section)
- Pass `date` prop (formatted as `YYYY-MM-DD`)
- Add a separator before the sessions section

### 5. Update: `src/components/calendar/CalendarView.tsx`
- Add `'sessions'` to the `CalendarFilters` type (default: `true`)
- Add a "Sessions" filter toggle (orange/primary colored dot)
- Pass the filter state to `CalendarDaySheet`
- Add session indicator dots on calendar days that have sessions (new query or piggyback on existing fetch)

### 6. New Hook or Extension: Calendar Day Indicators for Sessions
- To show dots on calendar days with sessions, add a lightweight query in `useCalendar` that fetches distinct `session_date` values for the visible month range
- Returns a `Set<string>` of dates with sessions
- Used by `CalendarView` to render an additional indicator dot on days with logged sessions

### 7. Update: `src/pages/PracticeHub.tsx`
- Remove `import { RecentSessionsList }` (line 18)
- Remove `<RecentSessionsList ... />` usage (line 411)
- Practice Hub now contains only: module selection → session type → readiness → configure → build session → summary

## Files

| File | Change |
|------|--------|
| `src/hooks/useDaySessions.ts` | **NEW** — fetch sessions for a date |
| `src/components/calendar/DaySessionsList.tsx` | **NEW** — session cards in day sheet |
| `src/components/calendar/SessionDetailDialog.tsx` | **NEW** — full session detail on click |
| `src/components/calendar/CalendarDaySheet.tsx` | Add `DaySessionsList` section |
| `src/components/calendar/CalendarView.tsx` | Add sessions filter + day indicators |
| `src/hooks/useCalendar.ts` | Add session date indicator query |
| `src/pages/PracticeHub.tsx` | Remove `RecentSessionsList` |

## What This Does NOT Touch
- `PostSessionSummaryV2` — still used in Practice Hub after session completion
- `RecentSessionsList.tsx` file — can be deleted or left (no imports will reference it)
- Session creation/submission flow
- Any thresholds, metrics, or insight logic
- Database schema — reads existing `performance_sessions` table

