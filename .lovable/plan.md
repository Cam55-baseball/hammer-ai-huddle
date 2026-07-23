#### Root cause confirmed by code + database reads

1. **Dosage mismatch: card shows 8 sets, cue says 9 innings.**
   - `inning_restart_sim_bb` in `wk_movement_catalog` has `default_sets: 9`, `default_reps: 1`, and the cue says "Repeat for 9 innings."
   - In `supabase/functions/wk-generate-daily/index.ts`, when the CNS budget is exceeded, the generator clamps `sets` to `setsBase - 1`. For this user the `sets` value dropped from 9 to 8, so the card shows 8 sets while the cue still references 9 innings.

2. **Phase mismatch: "This movement was generated under an older season setting..."**
   - The user's `athlete_context.season_phase` is stored as `'in'`, but the generator only recognizes `'in_season'`. The generator falls back to the default `os_q1` phase.
   - The UI's `useSeasonStatus` defaults to `'in_season'` when no `athlete_mpi_settings` row exists, so the card's expected phase is `in_season` while the stored prescription is `os_q1`. This triggers the phase-mismatch banner, and the plan keeps regenerating into the same mismatch.

3. **Cadence-rest leakage: running reappears after refresh.**
   - The speed card can show a "cadence rest" or recovery day, but the conditioning block in `wk-generate-daily/index.ts` is not gated by the adaptation selector's `suppressed` list or by speed cadence. High-CNS sprint conditioning (like `inning_restart_sim_bb`) still shows up even when speed work is suppressed.

#### Plan

1. **Database — correct the inning-restart dosage model**
   - Update `inning_restart_sim_bb` in `wk_movement_catalog`: set `default_sets: 1`, `default_reps: 1`, `default_total_reps: 9`, `dosage_unit: 'innings'`.
   - Update `inning_restart_sim_sb` (softball mirror): set `default_sets: 1`, `default_reps: 1`, `default_total_reps: 7`, `dosage_unit: 'innings'`.
   - Rewrite the cue to remove the hardcoded inning count (e.g. "Sit 3–5 minutes to simulate a between-inning rest, then fire one sprint. Repeat for the prescribed number of innings.").
   - Audit the cue column for any other hardcoded numbers that can contradict the structured dosage columns and fix those too.

2. **Database — normalize season status strings**
   - Add a short helper that maps `athlete_context.season_phase` values to canonical values: `'in' → 'in_season'`, `'post' → 'post_season'`, `'pre' → 'preseason'`, `'off' → 'off_season'`.
   - Apply this normalization in the `wk-generate-daily` edge function before passing the season status into `resolveWkPhase`.
   - Apply the same normalization in the client-side `src/lib/seasonPhase.ts` and `src/lib/hammer/workout/phaseQuarter.ts` so the UI and generator always agree.

3. **Generator — fix CNS clamping for total-based dosage**
   - In `wk-generate-daily/index.ts` `push()`, before reducing `sets`, check if the primary dose is `total_reps`, `duration_seconds`, or `distance_feet` (movements where `sets` is just a container, such as `innings`, `contacts`, `seconds`, or `feet`).
   - For those movements, do not reduce `sets`. Instead reduce the total dose by a bounded percentage (e.g., max 25% with a floor of 1) and update the `why_volume` string to reflect the new value.
   - For `innings` specifically, keep `sets = 1` and reduce `total_reps` only if needed; ensure the UI renders "X total innings".

4. **Generator — respect adaptation suppression for conditioning**
   - Before the conditioning block runs, check `adaptationDecision.suppressed`. If `conditioning` is in the list, skip the block entirely and let the UI show the rest message.
   - Also skip high-CNS sprint conditioning (e.g., `inning_restart_sim_*`, `if_lateral_repeat_*`) when the speed card is a cadence-rest or the day is a recovery-only day, so "running" does not reappear after refresh.

5. **UI — tighten dosage rendering and phase mismatch copy**
   - Update `WkPrescriptionCard.tsx` to render `total_reps` with `dosage_unit: 'innings'` as "X total innings" instead of "X sets × 1 innings".
   - While the prescription is regenerating, soften the phase-mismatch banner to "Updating your plan..." instead of the alarming "older season setting" message.
   - Ensure `WkConditioningCard.tsx` shows a clear "Recovery day — no conditioning work" state when the block is suppressed.

6. **Edge function deployment and regeneration**
   - Deploy the `wk-generate-daily` edge function.
   - Delete today's `wk_prescriptions` rows for the affected user and force a regeneration so the corrected dosage, phase, and suppression logic apply immediately.
   - Optionally regenerate the next 3-7 days so the fix is consistent across the near-term plan.

7. **Verification**
   - Query `wk_prescriptions` for today to confirm `inning_restart_sim_bb` rows now have `sets=1`, `total_reps=9`, `dosage_unit='innings'`, and `phase` matches the user's actual season status.
   - Confirm that a recovery/cadence-rest day has no conditioning sprint in the DB.
   - Use the app preview to verify the card shows the correct dosage and no phase mismatch banner.

#### Files expected to change
- `supabase/migrations/<new>.sql` — catalog dosage fixes, cue audit, season status normalization (if needed on DB side)
- `supabase/functions/wk-generate-daily/index.ts` — CNS clamp logic, suppression gating, season status normalization
- `supabase/functions/_shared/wkPhaseQuarter.ts` — normalize helper
- `src/lib/seasonPhase.ts` — normalize short season status values
- `src/lib/hammer/workout/phaseQuarter.ts` — mirror normalization
- `src/components/hammer/WkPrescriptionCard.tsx` — dosage rendering and phase-mismatch copy
- `src/components/hammer/WkConditioningCard.tsx` — suppressed state display

#### Outcome
- Conditioning cards show precise, cue-aligned doses (e.g., "9 total innings" instead of "8 sets × 1 innings").
- Season phase mismatch warnings disappear for users whose `athlete_context.season_phase` is stored as a short value like `'in'`.
- Recovery/cadence-rest days no longer leak high-CNS sprint conditioning, so the plan stays consistent after refresh.