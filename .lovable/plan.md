

# Fix Season Phase Date Saving

## Problems Found

1. **Race condition in mutation**: When a user switches season status (e.g. to "preseason") and then sets a date, the mutation reads `query.data?.season_status` to determine which DB column to write. But `query.data` may still hold the old status because the invalidation/refetch hasn't completed yet. This causes the date to be saved to the wrong column (e.g. `in_season_start_date` instead of `preseason_start_date`).

2. **UI only shows dates for the active phase**: The user wants to set dates for all three phases, but the component only shows one pair of date pickers mapped to whichever phase is currently selected. When switching phases, previously saved dates appear lost because they were written to the wrong columns.

3. **No optimistic state**: After changing status, the UI waits for a full refetch before reflecting the new phase. During that window, date changes target the wrong phase.

## Solution

### `src/hooks/useSeasonStatus.ts`

- **Return all six date fields** individually (`preseasonStartDate`, `preseasonEndDate`, `inSeasonStartDate`, `inSeasonEndDate`, `postSeasonStartDate`, `postSeasonEndDate`) instead of mapping to generic `season_start_date`/`season_end_date`.
- **Accept explicit column names** in the mutation instead of inferring which column to write based on the current status. The mutation will accept a flat partial of all season columns directly (e.g. `{ preseason_start_date: '2025-01-15' }`).
- **Add optimistic updates** via `onMutate` to immediately update the cache, preventing stale reads.
- Remove `as any` casts since the columns exist in the generated types.

### `src/components/calendar/SeasonStatusSelector.tsx`

- **Show date pickers for all three phases** in an expandable section, each clearly labeled (Pre-Season dates, In-Season dates, Post-Season dates).
- Each date picker writes directly to its specific DB column (e.g. `preseason_start_date`) — no ambiguity.
- Highlight the active phase's date section.
- Keep the phase toggle at the top unchanged.

## Technical Detail

Current broken flow:
```text
User clicks "Pre-Season" → mutation({season_status: 'preseason'})
  → query invalidated, refetch starts
User clicks Start Date → mutation({season_start_date: '2025-03-01'})
  → targetStatus = query.data?.season_status (STALE: still 'in_season')
  → writes to in_season_start_date instead of preseason_start_date ❌
```

Fixed flow:
```text
User clicks "Pre-Season" → mutation({season_status: 'preseason'})
  → optimistic update, cache immediately shows 'preseason'
User sets Pre-Season Start → mutation({preseason_start_date: '2025-03-01'})
  → writes directly to preseason_start_date ✅
```

## Files

| File | Change |
|------|--------|
| `src/hooks/useSeasonStatus.ts` | Return all 6 date fields; accept explicit column names; add optimistic updates |
| `src/components/calendar/SeasonStatusSelector.tsx` | Show per-phase date pickers; write to explicit columns |

