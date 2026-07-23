The user has two concrete issues in Hammers Today Plan:

1. **FRC/mobility prescriptions (and any movement) are vague** — e.g., "FRC CARs — Full Body" shows "1 sets × 1 reps" with no duration, reps, or distance, so the athlete doesn't know how much to do.
2. **Workout cards (Lifts, Speed, Bat Speed, Conditioning) have no card-level Done/Skip button** unlike the other modality blocks. The user wants to mark the whole card done/skipped and have that state drive tomorrow's rest/cadence logic.

Current state (verified from DB and code):
- `wk_movement_catalog` has 5 rows with `default_sets=1`, `default_reps=1`, and no `duration_seconds`, `total_reps`, or `distance_feet`: `frc_cars_full_body`, `wu_lacrosse_ball_pec`, `wu_lacrosse_ball_glute`, `wu_barefoot_towel_scrunch`, `wu_calf_softball_pin`. These are the only catalog entries that will produce a vague "1×1" dosage.
- `WkPrescriptionCard` renders dosage from `wk_prescriptions` rows and falls back to "Follow the cue below" when the structured fields are empty.
- The four workout cards (`WkLiftsCard`, `WkSpeedCard`, `WkBatSpeedCard`, `WkConditioningCard`) only render `CardActions` (Game Plan / chat actions). They do not include `BlockCompletionControls`, which is used by the generic modality blocks in `HammerDailyPlan`.
- `ModalityKey` currently does not include `bat_speed`, `lifts`, `conditioning`, or `cross_sport`, so we must extend the engagement model to support card-level completion for these slots.

Plan

1. **Dosage specificity — fix 1×1 placeholders in the catalog**
   - Update the 5 flagged `wk_movement_catalog` rows with precise, athlete-friendly structured dosage:
     - `frc_cars_full_body` → 45 seconds per joint, 1 set, dosage unit `seconds`, `default_duration_seconds = 300` (or a meaningful total), and remove the count from the cue.
     - `wu_lacrosse_ball_pec`, `wu_lacrosse_ball_glute`, `wu_calf_softball_pin` → 60 seconds per side, `default_duration_seconds = 120`.
     - `wu_barefoot_towel_scrunch` → 20 reps, `default_total_reps = 20`, `default_sets = 1`, `default_reps = 20`, `dosage_unit = reps`.
   - Backfill the same values into `cue` so the old fallback text is still precise if any row still renders through the cue.

2. **Generator hardening — prevent vague 1×1 prescriptions**
   - In `wk-generate-daily/index.ts`, after a prescription is built, add a guard: if the row has `sets=1`, `reps=1`, and no `duration_seconds/total_reps/distance_feet`, then use the source library's `baseDose` or catalog `default_*` fields to inject a real dose. If still unresolved, the prescription is flagged for substitution rather than emitted to the athlete.
   - Ensure the guard is applied to every engine path (warmup, speed, bat speed, lifts, conditioning, cross-sport, arm care, recovery) so the error can never reach the user.

3. **UI hardening — never show an empty dose to the athlete**
   - Update `WkPrescriptionCard.tsx` dosage rendering so that if `sets=1` and `reps=1` with no other dose, it displays a clear, safe fallback instead of the vague cue-only message: e.g., "Complete as described in the cue" plus a note that the dose is being reconciled. If the structured dose is present, it is rendered as "N sets × M reps", "N seconds", "N feet", or "N reps total".

4. **Card-level completion controls for the four Wk cards**
   - Add `BlockCompletionControls` to the footer of `WkLiftsCard`, `WkSpeedCard`, `WkBatSpeedCard`, and `WkConditioningCard`.
   - Extend `ModalityKey` in `src/lib/hammer/prescription/dailyPlan.ts` to include `bat_speed`, `lifts`, `conditioning`, and `cross_sport` (optional, if cross-sport is promoted to its own card later).
   - Extend `src/lib/hammer/prescription/dailyEngagement.ts` to:
     - Add labels for `bat_speed`, `lifts`, `conditioning`.
     - Treat these as block-level states that persist to local storage, like the existing modalities.
     - Include them in the "healing rules" logic that sets `BLOCK_PHASE` (e.g., a completed `lifts` block becomes `cooling` for the next 24–48 h, and the daily intent header reflects that the CNS is recovering).
   - Wire the Wk cards to `HammerDailyPlan` via the existing `onEngagementChanged` callback so marking a card done updates the daily intent header and adaptive narrative.

5. **Optional: persist block-level completion to `wk_prescriptions.status`**
   - When a card is marked Done, also update all `wk_prescriptions` rows for that slot on that date to `status = 'completed'` (and `skipped` when skipped). This gives the generator a real signal to read the next day and avoids the "prescribed again after I completed it" complaint.
   - If this is too large for this turn, the immediate fix is the local storage + daily intent update; this item can be noted as a fast-follow.

6. **Validation**
   - Re-run the query to confirm the 5 catalog rows no longer have 1×1 placeholders with no dose.
   - Trigger a fresh `wk-generate-daily` run for the test athlete and verify the FRC/mobility rows show meaningful dosage in the UI.
   - Check that the four Wk cards now display Done/Skip buttons and that clicking them updates the daily intent header and persists after refresh.
   - Run the existing `wk` and `hammer` tests to ensure no regressions in the plan pipeline.

Out of scope (not requested): adding new exercises, changing the philosophy, or rebuilding the workout intelligence constitution. The focus is precise dosage and card-level completion.