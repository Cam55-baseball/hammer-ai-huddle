Goal: switch hitters and ambidextrous throwers are no longer silently defaulted to "R" in the Today Plan, and arm-care exposure is appropriate, role-aware, and never duplicated.

What we learned from the codebase
- `SideContext` already knows who is a switch hitter / ambidextrous thrower and stores `last_used_side` in `athlete_side_preferences`, but the side pickers were intentionally removed from the Today Plan header.
- `HammerDailyPlan` renders `BlockSideBadge` from `SideContext`, but the plan builder (`buildHammerDailyPlan`) only consumes a computed "weaker-side bias" cache; it does not receive the active selected side.
- `useWkDailyPrescriptions` already sends `side_hit` and `side_throw` to the `wk-generate-daily` edge function, but the edge function ignores them: the request body type only declares `plan_date`/`recent_ack`, and `resolveAthleteContext` reads non-existent `sidePreference.throwing_side`/`hitting_side` instead of the request body fields.
- Arm care is generated twice: the EASS throwing block always starts with band prep, and the `wk-generate-daily` lift composer always injects an `arm_care` role into the lift slot. The UI suppresses the lift-card display via `ArmCareBudgetContext`, but the underlying prescription still exists and can confuse the user.
- Arm care is not meaningfully scaled by position: infielders/outfielders receive the same full EASS stack as pitchers, and the two-way template is the only position-aware variant.

Proposed changes

1. Restore side pickers in the Today Plan header
   - Add a compact L/R toggle for `hit` when `isSwitchHitter` is true, and for `throw` when `isAmbidextrousThrower` is true.
   - Wire each toggle to `SideContext.setSide`, which persists to `athlete_side_preferences`.
   - Update the `BlockSideBadge` tooltip so it says "Toggle here or in Analyze/DelayCam".

2. Thread the active side into the daily plan builder
   - Change `buildHammerDailyPlan(ctx, scheduleSignal, sideBias, gpForPlan)` to accept `activeSide: { hit: Side; throw: Side }`.
   - In the `hitting` block: if the athlete is a switch hitter, default to the active side but still expose both sides (keep the current split). When the user explicitly selects a single side, surface that side first and make the weaker side optional. Add a side note explaining why both sides are shown.
   - In the `throwing` block: if the athlete is ambidextrous, mirror low-cost neural prep on the non-dominant arm (already present) but keep max-intent work on the active selected side. Add a `BlockSideBadge` for throwing/defense.
   - In the `defense` block: tag the active throwing side for fielding drills (e.g., glove hand / throwing-side first-step cue).

3. Make the workout generator respect the active side
   - Update the `wk-generate-daily` request body type to include `side_hit?: "L" | "R"` and `side_throw?: "L" | "R"`.
   - Map the `athlete_side_preferences` row (which stores `discipline`/`last_used_side`/`dominant_side`) to the correct active side before passing to `resolveAthleteContext`.
   - Override `athleteContext.identity.hitting_side` and `throwing_side` with the request body value when present; otherwise fall back to profile/bats/throws.
   - Store the active side in `wk_prescriptions.why_payload.side` so the Wk cards can render a side note on bat-speed, lift, and conditioning prescriptions where relevant.
   - Update `WkPrescriptionCard` to show the side tag when `why_payload.side` is present and the athlete is switch/ambi.

4. Audit and scale arm-care volume by role and phase
   - In `eassLibrary.ts`, reduce the default throwing-day stack for non-pitcher position players: in-season infielders/outfielders get `band prep + regulation catch + position skill + cooldown` (remove tennis ball, underload, long-toss, intent, overload). Off/pre-season non-pitchers get a short underload/regulation pair.
   - Keep the full stack for pitchers, catchers (pop-time work), and two-way players because the throwing load is central to their role.
   - Add a `roleBudget` to the EASS context: `position_player` (≤15 min), `catcher` (≤18 min), `pitcher`/`two_way` (≤30 min in off-season, ≤22 min in-season). Clamp `durationMin` to the budget.
   - In `wk-generate-daily`, do not auto-inject `arm_care` into the lift slot when the training context indicates a throwing block is being rendered that day (use the existing `isThrowingDay` or `game_today` flags). The lift card will instead show the existing "Arm care handled by throwing block" message.
   - On non-throwing days, keep the single `arm_care` lift primer from the catalog picker, but cap it to one movement and reduce volume for position players.
   - Expose a one-line rationale on the throwing block: e.g., "Pitcher — full arm-care stack today" or "Infielder — short maintenance arm care" so the athlete understands why the volume is what it is.

5. Validation / regression
   - Add/update unit tests for:
     - `resolveAthleteContext` with request body side overrides.
     - `buildEassPrescription` duration budgets for position_player vs pitcher.
     - `buildHammerDailyPlan` hitting block splits for switch hitters and active-side selection.
   - Run the existing side-context E2E fixture (`tests/e2e/side-context/switch-hitter.spec.ts`) and extend it to verify the side picker changes the Today Plan badge.
   - Verify the `wk-generate-daily` edge function compiles and the EASS throwing block still publishes for pitcher, catcher, and infielder roles.

Out of scope
- No new tables; `athlete_side_preferences` already exists and is the source of truth.
- No backend secrets or external APIs needed.
- No changes to the global design tokens; only the plan header and badges use existing UI components.
