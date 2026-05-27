## Remove the collapsible Game Plan wrapper

The `GamePlanCollapsible` shell sits between the Command Center and the full Game Plan chart, duplicating the "Game Plan" header that `GamePlanCard` already renders. Unwrap it so only the full chart remains.

### Changes

`src/pages/Dashboard.tsx`
- Replace the `GamePlanCollapsible` import with the existing `GamePlanCard` import.
- Swap `<GamePlanCollapsible selectedSport={selectedSport} />` (line 556) for `<GamePlanCard selectedSport={selectedSport} />`.

`src/components/dashboard/GamePlanCollapsible.tsx`
- Delete (no other references in the codebase).

### Out of scope

Command Center, GamePlanCard internals, coach/scout Game Plan, projections, runtime, replay, parity tests. UI-only removal.