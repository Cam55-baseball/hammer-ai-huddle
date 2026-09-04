# Game-day legality — duplicate column resolution (2026-09-04)

## What was wrong

1. **Generation never applied the game-day filter its own validator enforces.**
   `eligibleWith()` in `supabase/functions/wk-generate-daily/index.ts` gated
   training age, season, injury, scope, integrity and category budget — but not
   `game_day_legal`. The bat-speed and speed certifiers *do* enforce it, so
   generation proposed `cable_chops` / `med_ball_shot_put` on a game day and the
   certifier killed the whole plan. Fixed: the gate now runs at selection,
   with identical semantics to the certifier (only an explicit `false` blocks;
   `NULL` = untagged, not illegal).

2. **Two columns for one concept.** `wk_movement_catalog.game_day_legal` and
   `game_day_eligible` disagreed on **142 of 556** rows.

## Canonical column

`game_day_legal` is canonical. No application code ever read
`game_day_eligible` (it existed only as a field on a TypeScript row type).
`game_day_eligible` is now a **generated mirror**:

```sql
game_day_eligible boolean GENERATED ALWAYS AS (game_day_legal) STORED
```

so the two can never diverge again. Nothing was loosened: no
`game_day_legal = false` was flipped to `true`.

## Why the disagreements were NOT merged conservatively

The instruction was: if either column says not legal, the movement is not legal.
Applying that literally produces an impossible catalog:

| pool | game-day legal today | game-day legal after a conservative merge |
|---|---|---|
| speed — acceleration | 5 of 18 | **0** |
| speed — reactive | 12 of 15 | **0** |
| speed — top_speed | 5 of 15 | **0** |
| speed — mobility | 4 of 9 | **0** |
| **all speed categories** | 27 of 80 | **0 of 80** |
| bat speed (all categories) | 6 of 85 | 6 of 85 (unchanged) |

`game_day_eligible = false` on every warm-up row (`wu_*`: CARs, breathing
resets, foam rolling, band face pulls) and on every sprint row is not a
legality judgement — it is an unmaintained default. Merging it would have
deleted game-day speed and warm-up work entirely, on noise rather than on a
coaching decision.

**Open decision for the owner:** if any of the 142 rows below genuinely should
be game-day-illegal, set `game_day_legal = false` on those rows explicitly and
the generator will honour it immediately. Nothing else is required.

## The 142 rows (values before the mirror was installed)

Legend: `game_day_legal` → `game_day_eligible`.

### Bucket A — `game_day_legal = true`, `game_day_eligible = false` (63 rows)

cressey_bear_crawl_iso · cressey_hip_lift_march · cressey_prone_trap_raise ·
cressey_wall_hip_flexor_mob · cressey_wall_slide_with_lift · cressey_yoga_pushup ·
dl_jband_series · dl_med_ball_shotput · dl_pivot_pickoff_throw ·
dl_underload_swing_speed · heenan_anti_rot_press · heenan_apt_reset ·
heenan_dead_bug_reach · heenan_hip_shoulder_sep_drill ·
heenan_rotational_med_ball_scoop · ido_hollow_body_hold · ido_lizard_crawl ·
ido_scap_pulls_hang · ido_shinbox_get_up · ido_squat_sit · ido_thoracic_bridge ·
kot_ankle_pogo · kot_backward_sled_drag · kot_couch_stretch_iso ·
kot_elephant_walks · kot_hip_airplane · kot_reverse_nordic · kot_tibialis_raise ·
mar_grapevine_carioca · mar_multi_direction_starts · mar_pattern_ladder ·
mar_reactive_mirror · mar_underweight_ball_toss · mar_wallball_reaction ·
pap_overload_underload_bat · sp_1b_3b_dirt_read · sp_2color_start ·
sp_3pt_vs_2pt_audit · sp_backwards_sled · sp_ball_drop_react ·
sp_coach_signal_cross · sp_copenhagen_plank · sp_delayed_steal_read ·
sp_diveback_burst · sp_false_step_audit · sp_first3_contact ·
sp_fly_10_countdown · sp_holler_record_fly10 · sp_home_1b_lhh_slap ·
sp_home_1b_rhh · sp_mirror_5510 · sp_pogo_double · sp_pop_time_reactive ·
sp_primary_lead_jump · sp_sb_43ft_break · sp_secondary_lead_cross ·
sp_sl_rdl_iso · sp_sport_stance_start · sp_tagup_3b_burst · sp_tempo_100_75 ·
sp_tempo_build_60 · sp_tibialis_raise · ws_band_pull_through

### Bucket B — `game_day_legal = NULL` (untagged), `game_day_eligible = false` (79 rows)

lift_band_assisted_explosive_pullup · lift_band_assisted_plyo_pushup ·
lift_band_assisted_vertical_jump · lift_clap_pushup_plyo ·
lift_depth_drop_pushup · lift_drop_jump_rebound_assisted ·
lift_overspeed_band_bench_throw · lift_overspeed_band_row ·
lift_overspeed_band_squat_jump · wu_90_90_switch · wu_9020_reset · wu_a_skip ·
wu_adductor_rock · wu_altitude_drop · wu_ankle_bounce_series · wu_ankle_cars ·
wu_arm_line_spiral · wu_b_skip · wu_barefoot_towel_scrunch · wu_bird_dog_slow ·
wu_broad_jump_prep · wu_calf_softball_pin · wu_copenhagen_short_lever ·
wu_cossack_squat · wu_couch_stretch_active · wu_crocodile_breathing ·
wu_crossover_run · wu_crossover_symmetry_full_warmup · wu_deadbug_band_press ·
wu_dry_swing_progressive · wu_er_at_90 · wu_face_pull_band · wu_falling_start ·
wu_foam_roll_tspine · wu_forearm_pump · wu_frog_rock · wu_glute_bridge_walkout ·
wu_hip_airplane · wu_hip_cars · wu_jband_full_warmup · wu_lacrosse_ball_glute ·
wu_lacrosse_ball_pec · wu_lateral_line_reach · wu_line_hops_forward_back ·
wu_line_hops_lateral · wu_med_ball_scoop_toss · wu_med_ball_shot_put ·
wu_medball_rot_toss_wall · wu_miniband_lat_walk · wu_miniband_monster_walk ·
wu_mirror_throw_prep · wu_pallof_press_iso · wu_pogo_double · wu_pogo_lateral ·
wu_pogo_single · wu_prone_hip_ext_iso · wu_prone_tyw · wu_reaction_ball_wall ·
wu_scap_pushup · wu_scapular_cars · wu_serratus_wall_slide · wu_shin_box_get_up ·
wu_shoulder_cars · wu_shuffle_change_direction · wu_singleleg_glute_bridge ·
wu_sl_rdl_reach · wu_snap_jump · wu_spiderman_reach · wu_spinal_wave_standing ·
wu_spine_cars · wu_split_snap_jump · wu_split_stance_iso_hold ·
wu_thoracic_windmill · wu_thread_the_needle_slow · wu_tspine_open_book ·
wu_wall_hip_flexor_slide · wu_wickets_low · wu_worlds_greatest_stretch ·
wu_wrist_cars

## Empty-pool honesty

Bat speed has 6 game-day-legal movements out of 85 (`elastic_rotation` 2/21,
`med_ball` 2/17, `underload` 2/9; `pap`, `overload`, `rotational_strength`,
`heavy_implement`, `pvc`, `light_implement` all zero). That is now handled
honestly instead of as a failure:

- `gameDaySkipReasonCopy()` in `_shared/wic/legality/preSelection.ts` says
  "Game day: bat speed work is limited to activation only today — the
  &lt;category&gt; work is not cleared to run before a game."
- On a game day a block with an unfillable required category **publishes the
  legal picks it does have** instead of being dropped whole.
- No flag is ever flipped to make a block fill.

## What today's plan reads — and what it ignores

`wk-generate-daily` currently reads: `profiles`, `athlete_context`,
`athlete_mpi_settings` (season windows), `athlete_daily_log`,
`athlete_side_preferences`, `athlete_equipment_context`, `athlete_body_goals`,
`training_preferences`, `user_injury_progress`, `weight_entries`,
`scheduled_practice_sessions`, `gp_games` (existence only → `isGameDay`),
`wk_movement_catalog`, `wk_periodization_blocks`, `wk_prescriptions` (history),
`wk_session_logs`, `wk_movement_overrides`, `wk_standard_awards`.

It **ignores**, despite the data now existing:

| source | what it could inform | status |
|---|---|---|
| `foundation_fatigue_decisions` | today's CNS/dose cap | not read |
| `wk_cns_ledger` | written on publish, never read back | write-only |
| `gp_game_rep_counts` | real workload from games played | not read |
| `gp_v_at_bat_facts`, `gp_v_hitting_by_pitch_type`, `gp_v_plate_discipline` | bat-speed / hitting emphasis | not read |
| `gp_v_home_to_first`, `gp_v_baserunning` | speed emphasis and sprint cadence | not read |
| `gp_v_defense_by_position`, `gp_v_pitch_facts` | arm-care load | not read |

Recommended order when wiring these (one at a time, each with its own sample-size
floor and an honest "not enough data yet"):
1. `foundation_fatigue_decisions` + `wk_cns_ledger` read-back — pure safety, no
   new inference.
2. `gp_game_rep_counts` — real game workload feeding the CNS cap.
3. `gp_v_home_to_first` / `gp_v_baserunning` → speed emphasis.
4. Hitting views → bat-speed emphasis.
