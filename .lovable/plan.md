## Root cause

Edge-function logs for `wk-generate-daily` show the WIC validator is rejecting every generation with fatal issues:

- `lift_not_full_body` / `lift_missing_compound_lower|upper_push|upper_pull|core`
- `speed_governance_missing` on `accel_10_30y`, `lateral_first_step`, `repeat_90ft_bb`
- `speed_unresolved_template` (needs `acceleration`)
- `bs_unresolved_template` (needs `elastic_rotation`)

A DB inspection of `wk_movement_catalog` confirms a broken backfill: nearly every row has `movement_category = 'rotation'` regardless of slug, and `speed_category` / `bat_speed_category` / `conditioning_category` / `cross_sport_category` / `recovery_category` / `arm_care_category` are `NULL` for most rows.

Because Session Builders read categories from the catalog, no template can resolve — validation fatal → generation aborts → user sees "Elite plan couldn't build. Tap Regenerate." on every card (Lifts, Speed, Bat Speed, Conditioning).

## Fix

### 1. Data migration — correct governance categories on `wk_movement_catalog`

Add a single migration that UPDATEs each seeded slug to the category expected by its engine module. Categories are derived from `supabase/functions/_shared/wic/*/movementCategories.ts` and the slug-family conventions already used in the seeders.

Examples of the mapping (full mapping applied in the migration):

- **Lifts / `movement_category`**
  - `back_squat_*`, `front_squat*`, `trap_bar_dl*`, `rdl*`, `hip_thrust*` → `compound_lower`
  - `bench_press_*`, `db_bench`, `ohp*`, `landmine_press*` → `compound_upper_push`
  - `chin_up*`, `pullup*`, `db_row_bench`, `pendlay_row*`, `chest_supported_row*` → `compound_upper_pull`
  - `atg_split_squat`, `bulgarian*`, `bowler_squat`, `box_step_up`, `reverse_lunge*` → `single_leg`
  - `nordic*`, `copenhagen*`, `posterior_*` → `posterior_chain`
  - `pallof*`, `anti_rotation*` → `anti_rotation`
  - `farmer_carry*`, `suitcase_carry*` → `carry`
  - `dead_bug*`, `hollow*`, `plank*`, `deadbug*`, `hlr*` → `core`
  - `cable_chops`, `band_resisted_swings`, `med_ball_rot*` → `rotation`
  - Mobility / breathing → `mobility`
  - `crossover_symmetry*`, `jaeger*`, `plyocare*` → `arm_care`
- **Speed / `speed_category`** (leave `movement_category` NULL or `jump_landing` as appropriate)
  - `accel_10_30y`, `sprint_starts*`, `wall_drill*` → `acceleration`
  - `lateral_first_step`, `crossover_run` → `lateral_agility`
  - `repeat_90ft_bb`, `tempo_runs` → `alactic_capacity`
  - `broad_jump*`, `depth_jump*`, `bounds*` → `elastic_plyo`
- **Bat Speed / `bat_speed_category`**
  - `band_resisted_swings`, `cable_chops`, `med_ball_rot*`, `overload_bat*`, `underload_bat*` → `elastic_rotation`
  - `heavy_bag_swing*` → `heavy_load_rotation`
  - `contact_point_tee*` → `precision_rotation`
- **Conditioning / `conditioning_category`**
  - `bases_*`, `catcher_up_downs`, `tempo_runs` → `aerobic_base`
  - `hiit_bike`, `assault_bike_intervals` → `alactic_intervals`
- **Cross-sport / `cross_sport_category`**
  - `cross_sport_*` → `coordination`
- **Recovery / `recovery_category`**
  - `contralateral_cross_crawl`, `deep_squat_breathing`, `foam_roll*`, `parasympathetic_reset*` → `regeneration`
- **Arm-care / `arm_care_category`**
  - `crossover_symmetry_full`, `jaeger_j_bands`, `plyocare_reverse_throws` → `throwing_day`

The migration is idempotent (`UPDATE ... WHERE slug = ...`) and only sets columns that currently hold the wrong value or NULL. No schema change, no drops, additive per system-freeze rules.

### 2. Toast UX — one clean message per generation attempt

`src/hooks/useWkDailyPrescriptions.ts`:

- Keep the single retry loop, but on final failure show ONE toast (`toast.error(..., { id: "wk-generate-failed" })`) so it doesn't stack across cards.
- Message: **"Today's plan is regenerating — tap Regenerate if it doesn't refresh."** (less alarming; still actionable).
- Add a small `console.warn` with the returned edge-function error body for diagnostics.

No other UI, schema, or engine logic changes.

### Validation

1. Apply migration → re-run `wk-generate-daily` for the affected user/date → confirm no `WIC validation failed` fatal issues in edge logs.
2. Confirm Lifts card resolves `full_body_strength` (compound_lower + upper_push + upper_pull + core present).
3. Confirm Speed template `speed.acceleration` and Bat Speed template `bs.max` resolve.
4. Confirm the error toast no longer appears on the Today plan.
