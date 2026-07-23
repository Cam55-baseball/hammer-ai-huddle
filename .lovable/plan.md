## Goal

Every prescription shown in Hammers Today must display an unambiguous, age-8-readable dosage: **sets × reps × duration × distance** where applicable. No more `1 set × 1 rep` for tennis-ball work, no more `Weightless — smooth, quiet, rhythmic` without a stopwatch, and no more wicket runs without a distance.

## Current state (confirmed by reads)

- `wk_movement_catalog` only stores `default_sets`, `default_reps`, `default_tempo`, `default_load_pct`. There are **no** duration or distance columns.
- Cross-sport WOST movements (`wost_tennis_ball_self_rally`, `wost_tennis_ball_one_hand_catch`, etc.) have `default_sets=1`, `default_reps=1`, and a cue that lacks a time/distance prescription.
- Speed movements (`sp_wicket_maxvelo`) have `NULL` sets/reps; the cue mentions "10 wickets" but does not state the run length or total volume.
- The generator in `supabase/functions/wk-generate-daily/index.ts` hard-codes `{ sets: 1, reps: 1 }` for cross-sport and passes `{}` for speed/bat-speed/conditioning, relying on catalog defaults that are often empty or vague.
- `WkPrescriptionCard.tsx` renders dosage as `sets • reps • tempo • load_pct` only; it cannot show duration, distance, or a human-readable "total volume" summary.
- `wk_prescriptions` and `wk_session_logs` have no duration/distance fields, so completed logs cannot record what actually happened.

## Plan

### 1. Extend the data model for precise dosage

Add columns to `wk_movement_catalog`:

- `default_duration_seconds` (integer, nullable) — total prescribed time per set, e.g. 60s self-rally, 120s wall-react.
- `default_distance_feet` (integer, nullable) — prescribed distance for running/wicket drills, e.g. 90ft, 60ft, 6×10ft wickets.
- `default_total_reps` (integer, nullable) — total rep target when a movement is not structured as sets×reps, e.g. 30 contacts, 50 throws.
- `dosage_unit` (text, nullable) — enum: `reps`, `seconds`, `feet`, `yards`, `contacts`, `throws`, `rounds`, `innings`, `through`, `each` — drives how the UI labels the value.

Add matching columns to `wk_prescriptions` so the published plan carries the exact dosage, and to `wk_session_logs` so athletes can log what they completed (`duration_seconds_completed`, `distance_feet_completed`, `total_reps_completed`).

Migration will include `GRANT`s for `authenticated` and `service_role`, `ENABLE ROW LEVEL SECURITY`, and an RLS policy scoped to `auth.uid()` on `wk_prescriptions`/`wk_session_logs` as required.

### 2. Backfill all catalog rows with precise dosage

Categorize every movement and assign values that an 8-year-old can execute without interpretation:

| Movement type | What gets precise |
| --- | --- |
| Cross-sport (WOST) | `duration_seconds` + `total_reps` (e.g. "60 seconds, keep the rally alive for 30 clean contacts") |
| Speed / wickets | `distance_feet` + `sets` (e.g. "10 wickets × 6 ft each = 60 ft, 3 sets") |
| Conditioning | `sets` + `distance_feet` + `duration_seconds` (e.g. "9 innings, 1 × 90 ft sprint per inning, rest 3–5 min") |
| Arm care | `sets` + `reps` + `duration_seconds` where the protocol is time-based (e.g. Crossover Symmetry activation chart = 60 seconds, 1 set) |
| Bat speed | `sets` + `reps` + `total_reps` (e.g. med-ball throws: 3 sets × 5 reps each side) |

Also update the `cue` field on affected rows so the cue itself states the exact prescription: reps, seconds, or feet. No cue should end without a number.

### 3. Update the generator to stop hard-coding vague values

In `supabase/functions/wk-generate-daily/index.ts`:

- Remove the hard-coded `{ sets: 1, reps: 1 }` for cross-sport. Use the catalog’s `default_sets`, `default_reps`, `default_duration_seconds`, `default_distance_feet`, `default_total_reps`, and `dosage_unit`.
- For speed, bat speed, and conditioning, pass the catalog dosage instead of `{}`.
- Build a `formatDosage()` helper that composes the human-readable string from the available fields: prefer `sets × reps` for lifts, `duration_seconds` for time-based WOST, `distance_feet` for sprints, and combinations where needed.
- Store the computed dosage fields in `wk_prescriptions`.

### 4. Harden the validator to reject vague prescriptions

In `supabase/functions/_shared/wic/validator.ts`:

- Add a rule: every non-empty prescription must have at least one concrete dosage field populated (`sets+reps`, `duration_seconds`, `distance_feet`, or `total_reps`).
- If a prescription reaches the validator with no concrete dosage, emit a **fatal** issue: `missing_dosage` and block publication.
- This prevents the generator from ever shipping `1 set × 1 rep` again.

### 5. Update the UI to render dosage clearly

In `src/components/hammer/WkPrescriptionCard.tsx`:

- Extend the dosage line to show: `sets • reps • duration • distance • tempo • load` depending on which fields are present.
- Use age-friendly units: "30 seconds" not "00:30", "60 feet" not "60ft", "3 throws each side" not "3x2".
- Add a "Total today" micro-line if a movement has multiple dosage components (e.g. "3 sets × 10 wickets × 6 ft = 180 ft total").
- Continue to hide coaching jargon (CNS, phase, doctrine) per existing policy; the new dosage fields are athlete-facing, not coach metadata.

### 6. Update completion logging

In `WkPrescriptionCard.tsx` and `wk_session_logs`:

- When an athlete marks a movement complete, write the planned duration/distance/total_reps into the log if available.
- Keep the log backward-compatible; existing `sets_completed`/`reps_completed` still work for lifts.

### 7. Verify and test

- Query the catalog after backfill to confirm every cross-sport, speed, conditioning, and arm-care row has a populated dosage field.
- Run the `wk-generate-daily` edge function locally or via the existing regression flow and inspect the generated `wk_prescriptions` rows.
- Open the Hammers Today preview and confirm the card dosage matches the examples in the user screenshots: the cross-sport tennis-ball movement shows a duration, the wicket run shows a distance, and the crossover-symmetry activation shows a clear reps/time value.

## Technical details

- **Files to change**: `supabase/functions/wk-generate-daily/index.ts`, `supabase/functions/_shared/wic/validator.ts`, `src/components/hammer/WkPrescriptionCard.tsx`, plus a new migration for catalog/prescription/log schema changes.
- **Data to change**: `wk_movement_catalog` rows for `category IN ('cross_sport', 'speed_lab', 'conditioning', 'arm_care', 'bat_speed')` and any row with `default_sets IS NULL` or `default_reps IS NULL`.
- **No AI/LLM terminology change** per existing policy: dosage labels remain neutral and instructional, not "AI-generated".

## Outcome

Athletes will see precise, executable instructions on every card. An 8-year-old can read a cross-sport movement and know exactly how many seconds to rally, how many contacts to make, and how many sets to complete. The validator will block publication if any movement slips through without a concrete dosage.