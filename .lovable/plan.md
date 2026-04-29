## Problem

Users report that when they log hydration (water or any beverage), the entry briefly appears and then disappears from today's totals — even though the row IS being persisted to the database (verified: `hydration_logs` rows for users today are present and intact).

The root cause is in `src/hooks/useHydration.ts`. Several instances of this hook run simultaneously across the page (the header `HydrationTrackerWidget`, the `HydrationQualityBreakdown` card, and `QuickLogActions`). The hook has unstable references and a duplicated post-write block that combine to drop today's logs from local state.

## Root Causes

1. **Unstable `today` and callbacks** (`useHydration.ts` line 102):
   `const today = format(new Date(), 'yyyy-MM-dd')` is recomputed on every render. This causes:
   - `fetchTodayLogs` (deps `[user, today]`) to be recreated every render.
   - The realtime subscription `useEffect` (deps `[user, fetchTodayLogs]`) to **tear down and resubscribe on every render**. While the channel is mid-resubscribe, postgres_changes events for newly inserted hydration logs are missed by the *other* hook instances on the page, so their `todayLogs` never include the new row. The instance that inserted it shows it (via optimistic `setTodayTotal`), then `fetchTodayLogs` runs once and the result is overwritten by a later effect cycle that re-runs `fetchTodayLogs` *before* the row is committed in some cases.
   - The cross-instance `BroadcastChannel` does NOT deliver messages within the same tab, so the only sync mechanism between instances in the same tab is the (broken) realtime subscription.

2. **Duplicated post-insert block** (lines 477–507):
   After a successful insert the code runs `setTodayTotal(newTotal)` → `fetchTodayLogs()` → BroadcastChannel post **twice in a row**. This causes two refetches and two toast pops, and the second `setTodayTotal(newTotal)` clobbers any concurrent realtime-driven update, sometimes resetting the displayed total back to a stale value if the second fetch resolves before the first.

3. **No date rollover guard**: If the tab stays open across midnight, `today` only updates on re-render, and the realtime filter on `user_id` still works, but the local `log_date` filter in `fetchTodayLogs` becomes stale silently. (Lower priority, but worth fixing while we're here.)

## Fix

### `src/hooks/useHydration.ts`

1. **Stabilize `today`** with `useState` + a periodic check (every 60 s) so it only changes when the calendar day rolls over — not on every render.

2. **Remove the duplicated block** at lines 492–507 inside `addWater`. The post-insert flow runs exactly once: optimistic `setTodayTotal`, single `fetchTodayLogs()`, single BroadcastChannel post, single goal-reached / "+X oz logged" toast.

3. **Stabilize realtime subscription** — keep the channel alive across renders by depending only on `user?.id` (not on the `fetchTodayLogs` reference), and call `fetchTodayLogs` via a ref so the latest version is always used. This prevents the resubscribe storm and guarantees other hook instances receive postgres_changes events for the newly inserted row.

4. **Use `fetchTodayLogs` after insert as the source of truth** (since it's now reliable). Keep optimistic `setTodayTotal` for snappy UI but let the subsequent `fetchTodayLogs` reconcile.

### Verification

After the fix:
- Log +8 oz from `QuickLogActions` on `/nutrition-hub` → total updates immediately, persists.
- Reload the page → entry still present (already true, but now also true visually without flicker).
- The header widget and the quality breakdown card both reflect the new entry within ~1 s via realtime.
- No duplicate toasts.

## Files Changed

- `src/hooks/useHydration.ts` — stabilize `today`, dedupe post-insert block, stabilize realtime subscription via ref.

No DB schema changes, no RLS changes, no edge function changes.
