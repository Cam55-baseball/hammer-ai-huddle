
## What's wrong today

1. **"Edit season dates" boots you to login.** The popover in `SeasonPhaseChip` links to `/profile`. `src/pages/Profile.tsx` still uses the legacy bare-redirect pattern (`if (!user && !session) navigate("/auth")` inside a `useEffect`). During the dynamic chunk load + auth-context rehydrate on the new route, `user`/`session` are momentarily null and the effect fires, so a still-signed-in athlete is kicked to `/auth`. This is the same eviction class we already fixed elsewhere with `useRequireAuth` (400 ms re-check, visibility guard, `isAuthStable` gating).

2. **No way to import a schedule from the Calendar module.** The AI schedule importer dialog (`SeasonScheduleImporterDialog`) is only mounted inside `HammerScheduleStrip` on the dashboard. The Calendar page has no entry point, so athletes can't upload a photo of a season/month/week schedule from `/calendar`.

3. **Imported games look like every other custom activity.** Rows written by `useImportScheduleEvents` land in `public.games` (and `scheduled_practice_sessions` for practice/travel). The calendar adapters don't distinguish "AI-imported" events, so they render with generic colors and athletes can't tell what came from a schedule import.

## Changes

### 1. Fix the /profile eviction (root cause of "kicked to login")

- `src/pages/Profile.tsx`
  - Remove the bare `if (!user && !session) navigate("/auth")` inside the `useEffect` at lines 135-149.
  - Add `useRequireAuth()` at the top of the component (same hook used by `AnalyzeVideo` and other protected pages — it waits for `isAuthStable`, skips while the tab is hidden, and re-checks `supabase.auth.getSession()` after 400 ms before navigating).
  - Keep the rest of the effect (viewing-other-profile detection + `fetchProfile`) but guard it with `if (!user) return;` instead of redirecting.

This eliminates the race where the chip → popover → `/profile` navigation evicts the user during chunk hydration.

### 2. Add the AI schedule importer to the Calendar module

- `src/components/calendar/CalendarView.tsx`
  - Import `SeasonScheduleImporterDialog` and add a new toolbar button next to "Add Event":
    - Label: **"Import schedule"** with an `Upload` icon.
    - Opens the existing `SeasonScheduleImporterDialog` (text paste or photo upload → Gemini parses → review table → writes to `games` / `scheduled_practice_sessions`).
  - No new persistence logic — reuses `useImportScheduleEvents`. After save, the existing `useSchedulingRealtime` + query invalidations already refresh the calendar.

This makes the importer discoverable directly from `/calendar`, not just the dashboard strip.

### 3. Color imported games/tournaments distinctly

- `src/hooks/useCalendar.ts` (game branch where calendar events are built from `public.games`)
  - When `game_summary.source === "ai_schedule_import"`, tag the resulting `CalendarEvent` with:
    - `color: "#a855f7"` for `kind === "tournament_day"` (violet)
    - `color: "#ef4444"` for `kind === "game"` (red)
    - A small `(Imported)` suffix on the title or a stable badge field so the day cell can render a chip.
- `src/lib/calendar/adaptDerivedEvent.ts`
  - No change required; this only routes `public.games` rows that pass through legacy `useCalendar`.
- `src/components/calendar/` day-cell / list renderers
  - If they already honor `event.color` (they do for legacy events), no edit needed. If a cell hard-codes a color for the `game_plan`/`program` type, add a small override that respects the `color` field when present.

Custom activities the athlete adds manually keep their existing colors — only AI-imported rows pick up the new game/tournament palette.

## Out of scope

- No database migration. `games.game_summary` already stores the `source: "ai_schedule_import"` marker written by `useImportScheduleEvents`.
- No changes to the parsing edge function, the review table UX, or the Hammer dashboard strip.
- No changes to the Maximum-update-depth warning in `CalendarView` (separate issue, not part of this report).

## Technical notes

- `useRequireAuth` lives at `src/hooks/useRequireAuth.ts` and is already the project's canonical "don't evict during transient null session" guard.
- `SeasonScheduleImporterDialog` is a self-contained dialog — mounting it from `CalendarView` requires only an `open`/`onOpenChange` pair of local state.
- `useCalendar` is the legacy projector that reads `public.games`. The `game_summary` JSON column is already returned in its select, so the color/badge logic is a pure derivation in the mapper — no new query.
