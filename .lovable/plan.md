

# Season Status Selector for Calendar Module

## What it does
Adds a season context selector to the Calendar header where users can set their current season phase (In-Season, Pre-Season, Post-Season) with optional start/end dates. This setting persists in the database and can be referenced by other modules (practice sessions, game plan, etc.).

## Database

### Migration: Add columns to `athlete_mpi_settings`
Add three new columns to the existing `athlete_mpi_settings` table:
- `season_status` (text, default `'in_season'`) — one of `in_season`, `preseason`, `post_season`
- `season_start_date` (date, nullable)
- `season_end_date` (date, nullable)

This avoids creating a new table and keeps season context co-located with other athlete settings.

## New Component: `SeasonStatusSelector.tsx`

A compact card/section placed below the Calendar header that shows:
1. **Three-button toggle** — In-Season, Pre-Season, Post-Season (styled like `SeasonContextToggle`)
2. **Optional date pickers** — Start Date and End Date fields using the Shadcn date picker pattern, shown inline or in a collapsible row
3. **Auto-save** — Changes upsert to `athlete_mpi_settings` on selection; no separate save button needed

## New Hook: `useSeasonStatus.ts`

- Fetches the user's `season_status`, `season_start_date`, `season_end_date` from `athlete_mpi_settings`
- Provides an `updateSeasonStatus` mutation
- Uses React Query for caching

## Integration into CalendarView

- Import and render `<SeasonStatusSelector />` between the header card and the pending coach activities section
- The component is self-contained (fetches/saves its own data)

## Files

| File | Change |
|------|--------|
| Migration SQL | Add `season_status`, `season_start_date`, `season_end_date` to `athlete_mpi_settings` |
| `src/hooks/useSeasonStatus.ts` | New hook — fetch and update season status |
| `src/components/calendar/SeasonStatusSelector.tsx` | New component — toggle + date pickers |
| `src/components/calendar/CalendarView.tsx` | Render `SeasonStatusSelector` in the header area |

