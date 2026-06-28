## Problem
Importing tournaments/games via the Season Schedule Importer fails with `null value in column "team_name"`. The `public.games` table has multiple NOT NULL columns without app-level defaults that the importer doesn't populate: `team_name`, `league_level`, `base_distance_ft`, `mound_distance_ft`, plus `game_type` which the importer sets but should remain required.

## Fix
Update `src/hooks/useImportScheduleEvents.ts` so every `gameRows` insert includes safe, athlete-scoped defaults for all required columns the importer was missing:

- `team_name`: fetch the athlete's team name once (priority: `profiles.team_name` → `athlete_mpi_settings.team_name` → fallback `"My Team"`).
- `league_level`: pull from `athlete_mpi_settings.league_level` → fallback `"unknown"`.
- `base_distance_ft` / `mound_distance_ft`: pull from `athlete_mpi_settings` → fallback to standard baseball distances (90 / 60.5).
- Keep existing `opponent_name`, `game_date`, `status`, `game_type`, `sport`, `game_summary` lineage.

The fetch happens once per `mutationFn` call (before the loop) so a single import populates all rows consistently.

## Verification
- Re-import the same tournament text → all rows save without NOT NULL errors.
- Imported games appear on the calendar with the violet/red coloring already wired in `useCalendar.ts`.
- No schema changes; purely a client-side payload fix.