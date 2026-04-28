# Identity / Game Plan — "Standard not met" copy + Flame NN toggle

## What's wrong

1. **The "STANDARD NOT MET — X required actions remaining" header sits directly under the Identity card** (it's actually the `StandardAwarenessHeader` at the top of `GamePlanCard`). Users read it as part of the Identity tile and don't understand where the number comes from. The number is real — it's `nnTotal − nnCompleted` for today, where `nnTotal` is the count of the user's own custom activities flagged Non-Negotiable. But nothing on screen tells them that, so it feels arbitrary.

2. **The flame icon on each Game Plan task toggles Non-Negotiable, but**:
   - There is no visible label — only a tooltip (`title=`), which never appears on touch.
   - On rapid taps it sometimes appears to do nothing because `toggleNonNegotiable` calls `updateTemplate` (which already does an optimistic local patch) and then immediately calls `refetch()` + `refetchActivities()`. If the DB read returns before the write commit propagates, the optimistic flip is overwritten with the old value, the flame snaps back, and the success toast still fires — looking like a no-op.
   - Concurrent taps fire two in-flight updates with no guard, so the second tap's optimistic state can be clobbered by the first tap's refetch.

## Fix

### A. Clarify the standard header copy (`src/components/GamePlanCard.tsx`, `StandardAwarenessHeader`)

Replace the bare "X required actions remaining" line with a self-explanatory one that names the source and gives a one-tap path to see what's missing:

- When `nnTotal > 0` and incomplete:
  `"<completed>/<total> Non-Negotiables done today — tap to view"`
  (whole subline becomes a button that scrolls to `#nn-section`, same target the auto-scroll already uses)
- When `nnTotal === 0` and the user has logged nothing:
  Drop the rose "STANDARD NOT MET" entirely until the user either (a) creates an NN by tapping a flame, or (b) logs any activity. Replace with a neutral one-liner: `"No Non-Negotiables set. Tap the 🔥 on any activity to lock one in."` This kills the false-alarm rose banner that new users see before they've done anything.

Wire this through by:
- Extending `StandardAwarenessHeader` props to accept `nnCompleted`, `nnTotal`, `hasLoggedAnything`, and an `onJumpToNN` callback.
- Computing `hasLoggedAnything` from `dailyOutcome` (already exposes `nnTotal` and the underlying `anyActivityLogged` via `nn.data` — surface it on `DailyOutcome` as a new field `anyActivityLogged: boolean`).
- The hook `src/hooks/useDailyOutcome.ts` already has the value internally — just add it to the `DailyOutcome` interface and the `deriveOutcome` return.

### B. Make the flame action discoverable (`src/components/GamePlanCard.tsx`, task row ~line 1336)

- Add a tiny visible label under/next to the flame on the task row: `"Lock in"` when off, `"Locked"` when on, in 9px uppercase tracking-wider, same red palette. Keeps the row compact but removes the "what does this do?" question.
- On first render of a Game Plan that has zero NNs, show a one-time inline coachmark above the first custom activity row: `"Tap 🔥 to make this a daily Non-Negotiable."` Dismiss on first toggle; persist dismissal in `localStorage` under `hm:nn-coachmark-seen`.

### C. Make the flame toggle reliable (`src/components/GamePlanCard.tsx`, `toggleNonNegotiable` ~line 1093)

- Add an in-flight guard keyed by `templateId` using a `Set` ref so a second tap on the same row is ignored until the first resolves.
- Drop the post-update `refetch()` / `refetchActivities()` calls — `useCustomActivities.updateTemplate` already does an optimistic local patch, and the realtime subscription on `custom_activity_templates` (already present in `useDailyOutcome`) will reconcile. Removing the manual refetch eliminates the "snap back" race.
- If the underlying realtime channel isn't already invalidating the templates query in `useCustomActivities`, schedule a single delayed refetch at `+800ms` instead of immediate, so the write has time to commit.
- On error, explicitly revert the optimistic local patch in `updateTemplate` (currently it leaves the patched state in place even when the DB call fails — verify and add a rollback).

### D. Suppress the rose banner during the 300 ms commit debounce

`useDailyOutcome` initializes `committed.status = 'STANDARD NOT MET'` with `loading: true`. `StandardAwarenessHeader` already returns `null` while loading, so this is fine — but double-check that `dailyOutcome.loading` is properly `true` until both the NN query AND the day-state settle on a fresh page load. Currently `allReady = !nn.isLoading` ignores `dayType`. Add `useDayState`'s loading flag (or a derived `dayTypeReady`) to `allReady` so the header never flashes rose before day type is known.

## Files to edit

- `src/components/GamePlanCard.tsx` — header copy/props, flame label, in-flight guard, drop manual refetch
- `src/hooks/useDailyOutcome.ts` — expose `anyActivityLogged`, gate `allReady` on day-state readiness
- `src/hooks/useCustomActivities.ts` — verify/add optimistic rollback on update failure

## Out of scope

- No DB schema changes.
- No edge function changes.
- No change to the underlying NN counting logic in `src/lib/nnProgress.ts` (single source of truth stays intact).
