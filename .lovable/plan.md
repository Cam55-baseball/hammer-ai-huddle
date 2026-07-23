The FRC CARs row (`frc_cars_full_body`) currently has catalog defaults that are technically populated but are inconsistent and not reaching the athlete's prescription in a useful way. The live prescription for 2026-07-23 has `sets=1, reps=1, dosage_unit='reps'` with `duration_seconds` and `total_reps` NULL, so the card falls back to "Follow the cue below".

Root cause:
1. The catalog stores `default_duration_seconds=45` (per-joint) plus `total_reps=12`, which the UI renders as the confusing "45 sec per set • 12 total" rather than a clear athlete instruction.
2. The existing `wk_prescriptions` rows were generated before the dosage field mapping was fully wired, and the client-side `WK_GENERATOR_VERSION` (`wic_v1`) matches the stored `generator_version`, so the app never auto-regenerates.
3. The `SpeedCatalogRow` type used by the speed engine omits the new dosage fields, creating a silent gap where the catalog has data but the prescription engine is not explicitly contract-bound to copy it.

Plan

1. **Clean the catalog data for FRC and adjacent mobility movements**
   - `frc_cars_full_body`: set `default_sets=1`, `default_reps=1`, `dosage_unit='seconds'`, `default_duration_seconds=300` (5 min total), `default_total_reps=NULL`, and update the cue to say "5 min total" (not per-joint counts).
   - `wu_lacrosse_ball_pec`, `wu_lacrosse_ball_glute`, `wu_calf_softball_pin`: set `default_duration_seconds=120` (60 sec per side) and `default_total_reps=NULL`.
   - `wu_barefoot_towel_scrunch`: keep `default_sets=2`, `default_reps=20`, `default_total_reps=40`, `dosage_unit='reps'`, and clear any duration so it reads "2 sets × 20 reps".
   - Backfill the same plain-English language into each row's `cue` so the fallback is still precise.

2. **Bump the generator version to force regeneration**
   - Update `WIC_VERSION` in `supabase/functions/_shared/wic/constitution.ts` to a new value (e.g., `wic_v1.1`).
   - Update the matching `WK_GENERATOR_VERSION` in `src/hooks/useWkDailyPrescriptions.ts` to the same value.
   - This makes every existing prescription immediately stale on the next client refresh, triggering the auto-regenerate path.

3. **Harden the generator's dosage propagation**
   - Expand the `SpeedCatalogRow` interface in `supabase/functions/_shared/wic/engines/speed.ts` to include `default_duration_seconds`, `default_total_reps`, `default_distance_feet`, and `dosage_unit` so the speed engine is contractually aware of these fields.
   - Add a post-`push` validation guard in `wk-generate-daily/index.ts`: if a prescription ends up with `sets=1, reps=1` and no `duration_seconds`, `total_reps`, or `distance_feet`, fill it from the source catalog defaults. If still unresolved, flag it as a validation warning (so it can be substituted rather than shown to the athlete).
   - Apply the same guard to the conditioning, cross-sport, bat-speed, and arm-care paths, not just lifts/speed.

4. **UI hardening for time-based mobility**
   - In `WkPrescriptionCard.tsx`, when `unit='seconds'` and `duration_seconds` is present, render the total as a clear duration string (e.g., "5 min total") instead of "X sec per set".
   - For FRC/mobility specifically, prefer a single line: "Complete the full sequence for {duration_seconds} seconds total".
   - If a structured dosage is still missing after generator hardening, show a safe fallback: "Complete as described in the cue — dosage is being reconciled" rather than the vague "Follow the cue below".

5. **Force regeneration and validate**
   - After the edge function is redeployed, run the existing `wk-generate-daily` for the test athlete and verify that `frc_cars_full_body` now shows `duration_seconds=300`, `dosage_unit='seconds'`, `sets=1`, `reps=1`.
   - Open the Today plan in the preview and confirm the FRC card displays a precise dosage string (e.g., "5 min total") instead of the old "1 sets × 1 reps" or "Follow the cue below".
   - Run the `wk` and `hammer` test suites to ensure no regressions in the plan pipeline.

Out of scope: adding new movements, changing philosophy, or rebuilding the workout intelligence constitution. The focus is precise dosage, propagation, and regeneration.