#### Root cause confirmed by code + database reads
1. The new precise-dosage columns (`duration_seconds`, `distance_feet`, `total_reps`, `dosage_unit`) exist on `wk_prescriptions`, but the `wk_persist_prescriptions_atomic` RPC does **not** include them in its `INSERT`/`SELECT` mapping. Therefore every generated prescription is stored with `NULL` for those fields, and the UI falls back to legacy `sets × reps`.
2. Cross-sport catalog entries (e.g., `wost_tennis_ball_self_rally`) **do** have real values (`duration_seconds: 45`, `total_reps: 30`, `dosage_unit: seconds`), but because the fields are not persisted, the card shows the generic `1 sets × 1 reps` while the cue says “2 sets, 45 seconds, 30 contacts” — that is the conflict the user sees.
3. `crossover_symmetry_full` (the arm-care entry) is seeded with `default_sets: 1`, `default_reps: 1`, `default_duration_seconds: NULL`, `default_total_reps: NULL`, so it legitimately has no concrete dosage to show.
4. Current rows in `wk_prescriptions` for today all have `duration_seconds/total_reps/dosage_unit = NULL`.

#### Plan
1. **Database — repair the persistence RPC**
   - Migration to update `wk_persist_prescriptions_atomic` so it reads and inserts `duration_seconds`, `distance_feet`, `total_reps`, and `dosage_unit` from `p_rows` JSONB into `wk_prescriptions`.
2. **Database — fix catalog rows with empty dosage**
   - Backfill `crossover_symmetry_full` (and any other arm-care rows with `default_sets=1 AND default_reps=1 AND no duration/distance/total_reps`) with proper rep/duration schemes matching their cue text (e.g., Crossover Symmetry full chart → 60 total reps at 1 set × 10 reps per movement, or a clear total-reps value).
3. **Database — clean up stale cue text that contradicts the structured data**
   - Remove the generic “Go 45 seconds, aim for 30 clean contacts, 2 sets” placeholder that was apparently pasted into many cross-sport/WOST cues, and replace it with the accurate, movement-specific instructions consistent with the catalog’s `default_*` fields.
4. **Generator — enforce concrete dosage at publish time**
   - In `supabase/functions/wk-generate-daily/index.ts`, add a final validation rule: reject any prescription that has no concrete executable number (no `sets+reps`, no `duration_seconds`, no `distance_feet`, no `total_reps`). Make it a fatal validation error so the user never sees a vague 1×1 again.
5. **Edge function — deploy and regenerate affected plans**
   - Redeploy `wk-generate-daily`.
   - Trigger regeneration for existing plans (at least the current date and the next few days) so the newly persisted columns populate. If the user is logged in, a quick test via the app or an admin script will confirm the card now shows the correct dosage.
6. **UI — small sanity check**
   - Verify `WkPrescriptionCard.tsx` already renders the new fields; it does based on current code. No UI change unless the fallback “Follow the cue below” appears when it should not.

#### Files expected to change
- `supabase/migrations/<new>.sql` — RPC + catalog backfill
- `supabase/functions/wk-generate-daily/index.ts` — validation rule
- Possibly `src/components/hammer/WkPrescriptionCard.tsx` if fallback copy needs tightening

#### Outcome
- Cross-sport cards show real time/distance/contact targets (e.g., “45 sec per set • 30 total contacts”).
- Arm-care cards show a real rep scheme (e.g., “1 set × 60 total reps” or “2 sets × 10 reps”).
- No future prescription can publish without a concrete, executable dosage.
- The conflict between the card summary and the cue text disappears.