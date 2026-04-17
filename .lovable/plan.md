

## Plan — Fix Hydration Not Reflecting in Daily Targets

### Root cause

`useHydration()` is called in 7 places (`MacroTargetDisplay`, `NutritionScoreCard`, `HydrationQualityBreakdown`, `QuickLogActions`, `HydrationTrackerWidget`, `useDailyNutritionTargets`, `useMealVaultSync`). Each call creates an **independent local-state instance** of `todayLogs` / `todayTotal`. When the user logs water from one component, only that component's state updates — the daily targets card still shows the old value until full page reload.

There is no realtime subscription on `hydration_logs` and no cross-instance broadcast.

### Fix — add cross-instance sync to `useHydration`

In `src/hooks/useHydration.ts`:

1. **Subscribe to a shared `BroadcastChannel('data-sync')` event** (matches existing pattern per memory `mem://architecture/multi-tab-synchronization-strategy`). After every successful `addWater` / `deleteLog`, post `{ type: 'hydration:changed', userId }`. All other instances receive it and call `fetchTodayLogs()`.

2. **Subscribe to Supabase realtime** on `hydration_logs` filtered by `user_id`. Any INSERT/DELETE refetches `fetchTodayLogs()`. This also covers other tabs and edge-function/MealVaultSync inserts.

3. **Cleanup** both subscriptions on unmount.

### Files

| File | Change |
|------|--------|
| `src/hooks/useHydration.ts` | Add BroadcastChannel post on add/delete + listener; add realtime subscription on `hydration_logs`; refetch on receive |

### Out of scope

- No DB changes, no RLS changes
- No component refactors — every consumer keeps its current API
- Hydration goal/settings sync (already correct enough, only changes from settings page)

### Verification

After fix: Log water from the popover widget → `MacroTargetDisplay` "Hydration" row updates within ~200ms without reload, on the same tab and across tabs.

