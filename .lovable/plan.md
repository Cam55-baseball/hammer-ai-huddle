## Goal
The left-side menu should show **only the training modules a user actually subscribed to**. A user with just Complete Pitcher must not see 5Tool Player or Golden 2Way (and vice versa). Owner/Admin still see everything for testing.

## Root cause
`AppSidebar.tsx` currently uses `getActiveTier(modules, sport)` which collapses the user's subscriptions into a single "highest" tier and renders one block based on that. Two real problems:

1. **Owner/Admin show-all is fine**, but any non-owner user whose `modules` contain multiple tier keys (e.g. they bought Pitcher + 5Tool separately) only sees one block.
2. **Tier inclusion logic** treats Golden 2Way as superseding 5Tool/Pitcher in `getActiveTier`, so a Golden subscriber correctly sees only Golden — but the *individual* tier blocks were always meant to be exclusive. The user's intent is simpler: render each block iff that specific tier key is in `modules`.

## Fix
Replace the `activeTier`-based rendering in `AppSidebar.tsx` (lines ~185–248) with **direct per-module checks** against the subscribed `modules` array for the currently `selectedSport`:

- Show **Complete Pitcher** block if `modules` includes `${sport}_pitcher` OR `${sport}_golden2way` (Golden grants pitching) OR legacy `${sport}_pitching`. Owner/Admin always.
- Show **5Tool Player** block if `modules` includes `${sport}_5tool` OR `${sport}_golden2way` (Golden grants hitting/throwing). Owner/Admin always.
- Show **Golden 2Way** block ONLY if `modules` includes `${sport}_golden2way`. Owner/Admin always.

This means a Pitcher-only subscriber sees only the Complete Pitcher block. A Golden 2Way subscriber sees Pitcher + 5Tool + Golden (because they paid for the union). A 5Tool-only subscriber sees only 5Tool. Owner/Admin see all three.

Also remove the now-redundant `getActiveTier` call in this file (keep the helper itself; other files use it).

Players Club / Royal Timing / Video Library / Drill Library gating (any subscription) is unchanged.

## Technical notes
- File: `src/components/AppSidebar.tsx`
- Replace the `useMemo` block that builds `trainingModules` so each tier block has its own `if` based on a direct `modules.includes(...)` check, with the Golden-grants-lower-tiers semantics above.
- Keep `selectedSport` dependency so switching sports re-evaluates which blocks appear.
- No DB / hook / type changes. No edge-function changes.
- Legacy `_hitting` / `_pitching` / `_throwing` block at lines 251–293 remains for users still on legacy keys.

## Verification
- User with `['baseball_pitcher']` → only Complete Pitcher block.
- User with `['baseball_5tool']` → only 5Tool Player block.
- User with `['baseball_golden2way']` → Pitcher + 5Tool + Golden blocks.
- User with `['baseball_pitcher','baseball_5tool']` → Pitcher + 5Tool blocks (no Golden).
- Owner/Admin → all three blocks.

## Files to edit
- `src/components/AppSidebar.tsx`