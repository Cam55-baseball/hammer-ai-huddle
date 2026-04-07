

# Auto-Detect Active Season Phase from Dates

## Problem
The "(active)" label is determined solely by the `season_status` field in the database, which is manually set by clicking the phase toggle. It does not consider whether today's date actually falls within a phase's start/end range. So even though Pre-Season ended March 13 and today is April 7, Pre-Season still shows as active.

## Solution
Add date-based auto-detection logic to `useSeasonStatus.ts`. After fetching the season data, compute which phase today falls within and automatically update `season_status` in the database if it's stale. This keeps the active label accurate without requiring manual switching.

## Changes

### `src/hooks/useSeasonStatus.ts`
- Add a helper function `detectCurrentPhase(data: SeasonData): SeasonStatus | null` that checks if today's date falls within any phase's start/end range (inclusive).
- After the query resolves, if a phase is detected and it differs from the stored `season_status`, automatically call `updateSeasonStatus({ season_status: detectedPhase })`.
- Use a `useEffect` with a ref guard to avoid infinite update loops — only auto-correct once per data fetch.

```
function detectCurrentPhase(data):
  today = format(new Date(), 'yyyy-MM-dd')
  for each phase (preseason, in_season, post_season):
    if start <= today <= end: return phase
  return null
```

### `src/components/calendar/SeasonStatusSelector.tsx`
No changes needed — it already reads `seasonStatus` from the hook, so once the hook auto-corrects it, the UI updates automatically.

### Single file change

| File | Change |
|------|--------|
| `src/hooks/useSeasonStatus.ts` | Add `detectCurrentPhase` helper; add `useEffect` to auto-update `season_status` when today falls within a different phase's date range |

