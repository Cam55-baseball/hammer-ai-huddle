## Issue 1 — Today Plan: Speed, Bat Speed, and Lifts fail to load

**Root cause (from `wk-generate-daily` edge logs):** the WIC certifiers reject every generation with fatal issues:

- `lift_not_full_body` — template `full_body_strength` requires `compound_lower, compound_upper_push, compound_upper_pull, core, rotation`, but the composed session is missing `compound_lower` and `rotation`.
- `lift_missing_compound_lower` / `lift_missing_rotational_demand` — same cause.
- `speed_duplicate_category` — the sprint composer emits two `acceleration` slugs in one session.
- `bs_unresolved_template` — `bs.max` requires a slug tagged `bat_speed_category = elastic_rotation`, none are picked.

Two contributing sub-causes:

1. **Season resolution drift** — user is `in_season` but the lift certifier resolved `full_body_strength` (off-season default), so the required-category list is stricter than the in-season template. The `resolveWkPhase` fix from the prior turn is not propagating into the lift template resolver's `seasonPhase` input.
2. **Composer/catalog mismatch** — `engines/strength.ts` picks slugs (`push_press_concentric`, `sa_standing_cable_row`, `sa_db_chest_press`, `sl_deadlift_fat_grips`, `paloff_press`, `slide_lunge`, `renegade_row`, `weighted_pullup_full`, `trap_bar_trunk_twist`, `waiter_carry`, `standing_cable_hip_flexor`, `rdl_concentric`, `trap_bar_dl_double_ecc`) that are either absent from `wk_movement_catalog` or lack a `movement_category`. The sprint composer emits two `acceleration` drills. The bat-speed composer emits no `elastic_rotation` slug.

## Issue 2 — Game Hub numeric inputs default to `0` and can't be cleared

Every `Input type="number"` in `src/components/games/*.tsx` (AtBatLogger, PitchLogger, DefenseLogger, BaserunLogger, SubLogger, GameSheet, dossier drawers) is bound to a state field that starts at `0`. React treats `value={0}` as a controlled `"0"` — the user can't blank the field to type their own number.

## Fix

### A. Backfill catalog governance (deterministic, additive)

One migration on `wk_movement_catalog`:

- Insert-or-update rows for every slug referenced by `engines/strength.ts`, `engines/sprint.ts`, `engines/batSpeed.ts` that is missing or mis-categorised. Categories:
  - `push_press_concentric`, `sa_db_chest_press`, `landmine_row_to_press`, `bench_press_concentric`, `db_bench` → `compound_upper_push`
  - `sa_standing_cable_row`, `weighted_pullup_full`, `weighted_pullup_concentric`, `renegade_row`, `lat_pulldown`, `db_row_bench` → `compound_upper_pull`
  - `back_squat_*`, `front_squat_double_ecc`, `trap_bar_dl_double_ecc`, `goblet_squat` → `compound_lower`
  - `hip_thrust_concentric`, `hip_thrust_double_ecc`, `rdl_concentric` → `posterior_chain`
  - `sl_deadlift_fat_grips`, `slide_lunge`, `kot_lunge`, `lateral_db_step_up` → `single_leg`
  - `paloff_press` → `anti_rotation`
  - `waiter_carry`, `standing_cable_hip_flexor` → `carry`
  - `trap_bar_trunk_twist`, `heavy_russian_twist` → `rotation`
  - `crossover_symmetry_full`, `jband_full_chart` → `arm_care`
- Bat speed `bat_speed_category = elastic_rotation` on `band_resisted_swings`, `cable_chops`, and add `med_ball_rot_shotput`, `overload_bat_swings`, `underload_bat_swings` if missing.
- Speed `speed_category`: keep `accel_10_30y = acceleration`; retag `sprint_starts_wall`/`wall_drill_march` → `acceleration`; ensure `top_speed_flys`/`fly_10s` → `top_speed`, `bounds_ab` → `elastic_plyo`, so the sprint composer stops emitting duplicate `acceleration`.

Idempotent `UPDATE ... WHERE slug = ...`; new rows via `INSERT ... ON CONFLICT (slug) DO UPDATE`. No schema change.

### B. Composer correctness (`supabase/functions/_shared/wic/engines/`)

- **`strength.ts`** — always emit one movement per required category from the resolved template (compound_lower + upper_push + upper_pull + core + rotation for full-body templates), pulling from the phase-legal slug list. Explicitly add a `rotation` slug (`heavy_russian_twist` or `trap_bar_trunk_twist`) so the in-season/off-season sessions never miss it.
- **`sprint.ts`** — enforce "one primary acceleration + one non-acceleration accessory" so `speed_duplicate_category` cannot fire; pick from `top_speed`/`elastic_plyo`/`change_of_direction` for the second slot.
- **`batSpeed.ts`** — always include one `elastic_rotation` slug for `bs.max`, gated on catalog tag.

### C. Season resolution reaches the lift certifier

In `supabase/functions/wk-generate-daily/index.ts` where `certifyLift` / `resolveLiftTemplate` is called, pass the canonical `seasonPhase` from `resolveWkPhase` (the same source the client uses via `useSeasonStatus`) instead of the raw off-season fallback. Verify `template.seasonPhase === "in_season"` when stored status is in-season.

### D. Softer failure UX (already partially present)

Keep the single non-stacking toast from `useWkDailyPrescriptions`; add a `retry` button on each failing card (already there via `CardActions`). No new UI copy.

### E. Numeric inputs in Game Hub — reusable `<NumberField>`

Create `src/components/games/NumberField.tsx`:

- Local string state seeded from the numeric prop (`""` when incoming value is `0` and `allowEmpty` is true, else `String(value)`).
- `onChange`: accept `""`; call parent with `undefined` (or `0` if `zeroOnBlank`) only on blur.
- Preserves `min`, `max`, `step`, `placeholder`, `className` passthrough.

Replace every `<Input type="number" value={f.xxx} onChange=...>` in:

- `AtBatLogger.tsx`, `PitchLogger.tsx`, `DefenseLogger.tsx`, `BaserunLogger.tsx`, `SubLogger.tsx`, `GameSheet.tsx`, `PitcherDossierDrawer.tsx`, `HitterDossierDrawer.tsx`

with `<NumberField ...>`. Business logic (submission, validation) untouched.

### Validation

1. Re-run `wk-generate-daily` for the affected user/date → confirm zero fatal issues in edge-function logs.
2. Reload Hammers Today → Speed, Bat Speed, and Lifts cards render with real prescriptions and CardActions.
3. Open Game Hub → each numeric field can be cleared (delete the `0`) and typed into freely; submitting a blank field records `0` (or `null` where appropriate).

### Technical notes

- Migration is additive and idempotent — no data loss risk under system-freeze rules.
- Composer changes are deterministic; no new randomness.
- `NumberField` is presentation-only; no changes to `gp_*` tables or edge functions.
