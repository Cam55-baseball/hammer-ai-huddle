## What's wrong

**1. The 404.** `WkCardFailureNotice.tsx` deep-links to `/hammer/onboarding`, but the actual route in `App.tsx` is `/onboarding/athlete`. Every other `/onboarding/*` alias redirects to `/onboarding/athlete`, but the `/hammer/onboarding` path was never registered — so it falls through to the SPA 404.

**2. E2E link — mostly wired, one missing hop.** The four cards are already wired end-to-end: onboarding writes `profiles`, `athlete_context`, `athlete_body_goals`, `athlete_daily_log` → the `wk-generate-daily` edge function assembles an `AthleteContext` from those tables → the WIC validator counts `missing_fields` and either publishes the plan (Speed / Bat Speed / Lifts / Conditioning) or returns the structured error the cards now surface.

The missing hop: when the user finishes onboarding, nothing tells the Hammers Today snapshot to regenerate. The cards will keep showing the pre-onboarding failure notice until the user manually taps Retry or the auto-generate effect fires on next mount.

## Fix

### 1. Point "Finish onboarding" at the real route
In `src/components/hammer/WkCardFailureNotice.tsx`, change the navigate target from `/hammer/onboarding` to `/onboarding/athlete`.

### 2. Kick the plan on completion
In `src/pages/AthleteOnboarding.tsx`, extend the `onFinish` handler so that after clearing the draft it also invalidates the `["wk-rx", user.id, *]` queries. That triggers the auto-generate effect inside `useWkDailyPrescriptions`, which re-runs `wk-generate-daily` with the freshly-written context — the four cards then publish real prescriptions instead of the failure notice.

Same invalidation added to the "Open Command Center" button so refreshed context reaches the snapshot before the user lands on Hammers Today.

## E2E confirmation

After the two changes above, the flow is:

```text
Onboarding step writes → athlete_context / profiles / body_goals / daily_log
   ↓ (onFinish invalidates wk-rx cache)
useWkDailyPrescriptions auto-generate fires
   ↓
wk-generate-daily assembles AthleteContext (missing_fields shrinks)
   ↓
WIC engines certify → wk_prescriptions rows for lift / speed / bat_speed / conditioning
   ↓
Speed / Bat Speed / Lifts / Conditioning cards render items instead of WkCardFailureNotice
```

Cards will still show the failure notice for a specific engine if that engine's required inputs are genuinely absent (e.g. no equipment, no primary position). That's the intended constitutional behavior — the notice now lists which fields to fix and links to the correct onboarding route.

## Files touched
- `src/components/hammer/WkCardFailureNotice.tsx` — one-line path fix.
- `src/pages/AthleteOnboarding.tsx` — invalidate `wk-rx` on finish + Command Center button.
