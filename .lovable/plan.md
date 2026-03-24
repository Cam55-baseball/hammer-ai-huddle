

# Separate Date Ranges per Season Phase

## What changes
Currently there is one shared `season_start_date` and `season_end_date` pair. We need six date columns total — a start and end date for each of the three phases.

## Database Migration

Add 4 new columns to `athlete_mpi_settings` (the existing `season_start_date` and `season_end_date` will be repurposed as the in-season dates):

```sql
-- Rename existing columns to in_season-specific
ALTER TABLE public.athlete_mpi_settings
  RENAME COLUMN season_start_date TO in_season_start_date;
ALTER TABLE public.athlete_mpi_settings
  RENAME COLUMN season_end_date TO in_season_end_date;

-- Add preseason and post_season date columns
ALTER TABLE public.athlete_mpi_settings
  ADD COLUMN IF NOT EXISTS preseason_start_date date,
  ADD COLUMN IF NOT EXISTS preseason_end_date date,
  ADD COLUMN IF NOT EXISTS post_season_start_date date,
  ADD COLUMN IF NOT EXISTS post_season_end_date date;
```

## Hook: `src/hooks/useSeasonStatus.ts`

- Update the `SeasonData` interface to include all 6 date fields
- Update the query `select` to fetch all 6 columns
- Return per-phase date getters (or a single object with all dates)
- The mutation already uses upsert with spread — no structural change needed

## Component: `src/components/calendar/SeasonStatusSelector.tsx`

- When the user expands dates, show date pickers **for the currently selected phase** (not all three at once)
- E.g. if "Pre-Season" is active, show "Pre-Season Start" and "Pre-Season End" pickers
- Map the selected phase to the correct column names when saving:
  - `preseason` → `preseason_start_date` / `preseason_end_date`
  - `in_season` → `in_season_start_date` / `in_season_end_date`
  - `post_season` → `post_season_start_date` / `post_season_end_date`
- The dates section header updates to reflect the active phase (e.g. "Pre-Season Dates")

## Files

| File | Change |
|------|--------|
| Migration SQL | Rename 2 columns, add 4 new columns |
| `src/hooks/useSeasonStatus.ts` | Fetch/save all 6 date fields |
| `src/components/calendar/SeasonStatusSelector.tsx` | Show phase-specific date pickers |

