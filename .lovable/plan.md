## Goal
Take the "Bat R | L" and "Throw R | L" pickers off the Hammers Today Plan. Switch-hitters and ambidextrous throwers will continue to set side inside AnalyzeVideo, DelayCam, and drill/note logging surfaces. Weaker-side bias in the daily plan keeps running silently.

## Changes

1. `src/components/hammer/HammerDailyPlan.tsx`
   - Remove the two `<SideContextPicker discipline="hit" />` / `discipline="throw"` renders (around lines 279–281) from the plan header.
   - Keep the existing "Weaker side focus" badge (lines 267–277) — it's read-only and useful.
   - Keep `readSideBias(...)` and pass-through into `buildHammerDailyPlan` unchanged, so the plan still leans toward the weaker side automatically.
   - Keep the tiny `BlockSideBadge` (which just displays the active side per block) — it's a label, not a prompt.
   - Remove the now-unused `SideContextPicker` import if nothing else in the file uses it.

2. No changes to:
   - `SideContext` provider / storage — pickers elsewhere still need it.
   - `SideContextPicker` component — still used in AnalyzeVideo, DelayCam, drill logging, notes.
   - `athlete_side_preferences` writes — still occur when the athlete picks a side in those other surfaces.

## Verification
- Load `/index` (Hammers Today) as a switch-hitter account → confirm the R|L pill row is gone from the header.
- Confirm "Weaker side focus: Bat L" (or similar) still shows when applicable.
- Open AnalyzeVideo and a drill log page → confirm the R|L picker still appears there for switch/ambi athletes.
- Non-switch/non-ambi accounts: no visual change (pickers were already hidden for them).

## Out of scope
Any changes to onboarding handedness questions, side-aware storage, or the AnalyzeVideo side gate.
