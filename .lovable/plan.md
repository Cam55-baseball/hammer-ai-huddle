## Goal
Make the "Season dates" button on the Hammer schedule strip open a dedicated dialog for editing the season's start and end dates — separate from "Add game" (which keeps opening the AI schedule importer).

## Changes

1. **New component** `src/components/hammer/SeasonDatesDialog.tsx`
   - Dialog titled "Season dates".
   - Three phase rows (Pre-season, In-season, Post-season), each with start and end date pickers (Shadcn `Popover` + `Calendar`, `pointer-events-auto`).
   - Pre-populates from `useSeasonStatus().data`.
   - "Save" calls `updateSeasonStatus(...)` with the six `*_start_date` / `*_end_date` fields (stored as `YYYY-MM-DD` strings; columns already exist on `athlete_mpi_settings`).
   - "Clear" affordance per row to set the pair back to `null`.
   - On save: close dialog, toast success (sonner), invalidate `season-status`, `game-day-context`, and `hammer-daily-plan` queries.

2. **`src/components/hammer/HammerScheduleStrip.tsx`**
   - Add `const [seasonDatesOpen, setSeasonDatesOpen] = useState(false);`.
   - Change the "Season dates" button's `onClick` from `setImporterOpen(true)` to `setSeasonDatesOpen(true)`.
   - Mount `<SeasonDatesDialog open={seasonDatesOpen} onOpenChange={setSeasonDatesOpen} />`.
   - Leave "Add game" wired to the AI importer (unchanged).

## Out of scope
- No schema changes — the six phase date columns already exist on `athlete_mpi_settings`.
- No changes to "Add game" behavior or the importer.
- No changes to phase resolution logic (`resolveSeasonPhase` already consumes these dates).
