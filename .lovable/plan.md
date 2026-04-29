## Root cause

The toast `"Failed to save season status"` fires from `src/hooks/useSeasonStatus.ts` (line 93). The mutation that triggers it is **not** user-initiated — it's a background auto-correct in a `useEffect` (lines 100–110) that compares today's date to the user's saved preseason / in_season / post_season date ranges and silently `mutate()`s the detected phase if it differs from what's stored.

When the network is briefly unavailable at app startup (the console logs show many `TypeError: Failed to fetch` from `useOwnerAccess`, `useSubscription`, `useScoutAccess`, etc. all at the same timestamp), this background `UPDATE athlete_mpi_settings` also fails, and the generic error path fires the toast — even though the user never clicked anything.

So users are seeing a scary failure message for an automatic background reconciliation they didn't initiate.

## Fix

Make background auto-correction silent. Only show the error toast when the user actually triggered the update.

### `src/hooks/useSeasonStatus.ts`

- Add an internal `__silent?: boolean` flag to the mutation input. Strip it before sending to the DB.
- In `onMutate`, capture `silent` into the mutation context.
- In `onError`, only call `toast.error('Failed to save season status')` when `!context.silent`. Always still roll back the optimistic cache update.
- In the auto-detect `useEffect`, pass `{ season_status: detected, __silent: true }`.

### Why not also retry?

The auto-correct is idempotent and re-runs whenever `query.data` changes (e.g. on next refetch when the network recovers). The existing `autoCorrectRef` guard prevents tight loops for the same `{detected, stored}` pair, and on rollback the `stored` value stays the same so the next mount can retry once. No retry logic needed.

### Files touched

- `src/hooks/useSeasonStatus.ts` — silent flag plumbing (one hook, ~10 lines changed). No DB or schema changes. User-initiated calls to `updateSeasonStatus(...)` keep the existing toast on failure.