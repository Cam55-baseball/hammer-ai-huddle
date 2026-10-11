# Lifting audit (read-only) — 2026-10-11

Nothing was changed. No code, data or switches were touched. Numbers come from the exercise library (active rows), the planner's own code, 8-week simulations run on a copy of the planner's exercise lists and dose table, and the 1,182 lift rows in real saved plans.

## Summary

- **Missing from every real plan:** hamstring knee-bending work (Nordics, leg curls), calves/feet/shins, adductors, glute-med/abductors and hip rotation. The real saved plans have **0** hamstring curls, **0** calf/shin raises, **0** Copenhagens in the lift slot, **0** hip thrusts and 6 abductor rows across 1,182 lift rows.
- **Why:** this is mostly by accident, not by a rule. The planner fills lower-body slots from fixed short lists in `supabase/functions/_shared/wic/engines/strength.ts` (`compoundSlugsFor`, `unilateralSlugs`, `carrySlugs`, trunk lists). Those lists contain squats, split squats, step-ups, hinges, hip thrusts (in-season only) and sleds. They contain **no** leg curl, Nordic, calf, shin, adductor or abductor exercise.
- **What the templates require:** a squat-type lift, push, pull, core and rotation (`lift/templates.ts`, `CORE_FULL_BODY`). There is no required slot for single-leg, side-to-side, hamstring curl, adductor, abductor, calf/foot or hip rotation work.
- **Standards nobody can earn:** the weight-room standards include tibialis raise, calf raise and Nordic marks (`src/lib/hammer/standards/catalog.ts`), but the planner never prescribes those exercises.
- **Heavy spinal loading:** there is no rule built for it. It is held back only indirectly, by the barbell, eccentric-overload and deep-knee-bend age floors.
- **Movement tags:** 88 active `strength` exercises have no movement pattern, and 52 use the combined `hinge_squat` tag. Proposed tags are at the end (140 rows, 37 left for you to decide). Your figure of 112 likely also counts other lift categories or inactive rows: across all lift categories, 177 active rows have no pattern.

## 1. How lower-body lifts are picked

**Fields used:**

| Field | How it is used | Where |
|---|---|---|
| category | Decides which card an exercise can appear on. Lifts draw only from lift/trunk/conditioning; `kot` counts as lift. | `_shared/wic/domainGate.ts:37-122` |
| movement_category (falls back to pattern) | The certifier checks the day covers the template's required categories, with each main compound at most once. | `lift/sessionBuilder.ts:79-117, 288-303`; `lift/movementCategories.ts` |
| movement_pattern / bucket | Not used to choose lifts. Bucket is checked only by the library safety audit. | `catalog/safetyAudit.ts:30-41` |
| family / substitution_family | Groups "the same exercise" for the deep-knee-bend rule and for swaps. | `season.ts:64-70`; `lift/substitutions.ts` |
| deep_flexion | In season, only one maintenance exercise per family, capped at 2×5. Never before running or in a warm-up. Age 14+. | `season.ts:46-59, 114-142, 209-215`; `engines/strength.ts:291-303` |
| eccentric_overload | Never in season or post-season (law L0.3). Age 16+. Re-checked when the plan is saved. | `season.ts:176-200`; `schedule/finalCheck.ts:147-150` |
| unilateral | Not a selection field. Single-leg work comes from the single-leg list, which is optional in templates. | `engines/strength.ts:129-159`; `lift/templates.ts` |
| min_age_years | Hard age floor, checked at pick time and again at save time. | `domainGate.ts:192-263`; `finalCheck.ts:141-146` |
| season_eligibility / phase_allow / season_legality | All three are honoured. | `season.ts:220-229`; `domainGate.ts:230-238`; `finalCheck.ts:188-192` |
| pitcher_flags | Not used to pick lower-body lifts. Being a pitcher changes lift days around outings and start days. | `wk-generate-daily/index.ts:976, 1704-1712, 3786` |
| Heavy track | Only for 16+, training age 4+ years, not growing fast, no pain. Then the main lift uses a method (heavy triples, double eccentric, banded speed, isometric). | `dosage/methods.ts:47-159` |
| Growth mode | Taken from measured height changes. Blocks the heavy track and removes eccentric-overload and hard jump rows. | `growth/growthMode.ts:45-77`; `finalCheck.ts:182-187` |
| Goals | A scoring weight of 0.85–1.6 that changes which legal exercise wins. It never adds or removes one. | `goals/emphasis.ts:138-291` |
| Limb emphasis | A small bonus of up to 0.3 by leg/torso ratio. It never removes an exercise. | `lift/proportionEmphasis.ts:76-126` |

**Weekly balance.**
- **Early off-season (Q1–Q2):** a three-day wave — heavy day, speed day, power day (`engines/strength.ts:59-91, 308-314`).
- **Other phases:** the lead exercise rotates by day of the week. Among near-equal candidates (within 95% of the best score), the choice rotates by player and date (`lift/rotationBand.ts:60-93`).
- **What stops repeats:** only the main squat, push and pull may not repeat within a day. Nothing balances regions across the week. For example, nothing makes sure hamstrings or adductors get worked once.

**Sets, reps and % by phase** (main lift; `dosage/doctrine.ts:68-123`):

| Phase | Sets × reps | Purpose |
|---|---|---|
| Off-season Q1 | 4–5 × 4–6 | Build up |
| Off-season Q2 | 4–6 × 2–3 | Heavier |
| Off-season Q3 | 3–5 × 2–3 | Express |
| Off-season Q4 | 3–4 × 1–3 | Peak |
| In season | 2–3 × 2–3 | Maintain |
| Post-season | 2–3 × 5–8 | Recover |

- **Where in the range:** set by training age (beginner = low end, elite = high end) and the week of the block. Week 1 sits lower, week 3 higher, and week 4 is a deload at the floor (`doctrine.ts:163-264`).
- **Other trims:** one set is taken off when the day's hard-work budget is over. Hard safety caps apply. A data-driven lighter week multiplies sets by 0.6 (`lift/trendDeload.ts`).

**Verified maxes.**
- **How a max is confirmed:** only from weights the player typed — two qualifying sets, taking the second-best estimate, or a logged tested 1-rep max (`src/lib/lift/verifiedMax.ts`, server copy `_shared/wic/lift/verifiedMax.ts`).
- **What it shows:** working weight = % × verified max, rounded down to 5 lb. Until a max is verified, players see percentages only.
- **What it changes:** in the planner, verified maxes only feed the lighter-week check. They never change sets, reps or %.

## 2. Held back or skipped?

| Area | What happens | Rule / file | By design or accident |
|---|---|---|---|
| Deep knee bending | Allowed off-season. In season, one maintenance exercise at 2×5. Age 14+. | `season.ts:46-59, 209-215`; `engines/strength.ts:291` | Design |
| Heavy spinal loading | No rule of its own. Held back only through barbell, eccentric and deep-bend age floors. | `domainGate.ts:206-213` | **Accident (no named rule)** |
| Hamstring knee-bending | Nordics and GHR are 16+ and off-season only. Physioball and slideboard leg curls are 14+. **No list in the planner contains any of them**, so every age gets 0. **13-year-olds have no legal option at all.** | `season.ts:15-28`; library `min_age_years` | **Accident** |
| Adductors | Copenhagen plank (14+) is only in a trunk list. The adductor eccentric is 16+ off-season. A weak-adductor fault adds a bonus only once a fault is logged. | `engines/strength.ts:253`; `faultLedger/priority.ts:59, 121-128` | **Accident** |
| Glute med / abductors | Only "Side Plank + Leg Lift" exists. No list or rule uses it. | — | **Accident** |
| Hip rotation (internal/external) | Only Hip Airplane (14+), and no list uses it. | — | **Accident** |
| Side-to-side (frontal-plane) strength | Only the lateral DB step-up is in the single-leg list. Lateral lunges appear only as fault fixes. No template slot asks for it. | `engines/strength.ts:138, 150`; `wk-generate-daily/index.ts:5485` | **Accident** |
| Single-leg vs two-leg | Single-leg is optional in every template. Leg-length emphasis nudges the choice but sets no minimum. | `lift/templates.ts:63-99`; `proportionEmphasis.ts` | Partly design; no balance rule |
| Calves, feet, shins | 15+ knee-over-toe exercises exist (ages 0–13), but no list or template slot uses them. Fault fixes only. | `faultLedger/priority.ts:96-104` | **Accident** |
| Rotational power | Required as a light rotation/anti-rotation slot. Loaded rotational power is owned by the bat-speed engine. | `lift/templates.ts:32-38`; `batSpeed/sessionBuilder.ts:236-250` | Design |

## 3. 8-week simulations

**Setup.**
- **Covered:** 324 combinations — 3 roles × 2 sports × 3 age bands (13–15 as 14, 16–17 as 16, 18+ as 19) × 6 season phases × 3 training ages (0.5 / 2.5 / 5 years) — run over 8 weeks.
- **Lift days per week:** 3 off-season, 2 in-season and post-season.
- **Picks:** each day's lists from `engines/strength.ts`, filtered by age, season and the eccentric rule, with day-to-day rotation.
- **Doses:** from `resolveDose`, with the 4-week block.
- **How sets are counted:** a set counts toward every region its exercise trains.
- **Limits:** this copies the planner's own lists and rules. It does not run the full live builder, which also reacts to readiness, outings and swaps. The real saved plans above confirm the same gaps.

**Average hard sets per week, all combinations:**

| Region | Sets/week | Under 1/week |
|---|---|---|
| Quads / knee-dominant | 10.8 | 0 of 324 |
| Hinge / posterior chain | 7.5 | 0 |
| **Hamstring knee-bending** | **0.0** | **324 of 324** |
| **Glutes / hip extension** | **0.5** (off-season 0) | **216** |
| **Adductors** | **1.2** (in-season 0.6) | **138** |
| **Abductors** | **0.9** | **172** |
| **Calves / feet** | **0.0** | **324 of 324** |
| Rotation / anti-rotation | 3.8 (13–15: 2.9) | 9 |
| Upper push | 9.2 | 0 |
| Upper pull | 7.4 | 0 |

**By phase:** in season, quads fall to 3.9, hinge to 4.2 and upper pull to 3.5. Off-season Q1–Q2 is quad-heavy (16 sets) against 10 hinge.

**By age:** 13–15 gets less hinge work (6.1 against 8.2) and less rotation work (2.9 against 4.2) than older players.

**By role:** pitcher, position player and two-way are within ±0.6 sets. Role changes lift days, not lower-body exercise choice.

**Flagged (under 1 hard set a week):**
- hamstring knee-bending: every player
- calves/feet: every player
- glutes/hip extension: all off-season
- abductors: most players
- adductors: in-season and post-season

## 4. Tag quality

- **Missing tags:** 88 active `strength` exercises have no movement_pattern; 177 across all lift categories.
- **Combined tag:** 52 active exercises use the combined `hinge_squat` tag.
- **Possible slip:** "Swiss Bar Bench" and "Rear-Foot-Raised Resist-Turning Press" were picked up by a foot/ankle word match, so their tags should be checked by hand.

Proposed tags are below. **None are applied.** Rows marked "(owner to decide)" had no clear match.

| Code | Name | Today | Proposed |
|---|---|---|---|
| alternating_dumbbell_bench_press | Alternating Dumbbell Bench Press | none | horizontal_push |
| banded_push_up | Banded Push Up | none | horizontal_push |
| barbell_good_morning | Barbell Good Morning | none | hinge |
| barbell_lateral_lunge | Barbell Lateral Lunge | none | lateral_lunge_squat |
| belt_squat | Belt Squat | none | squat |
| bent_over_barbell_row | Bent Over Barbell Row | none | horizontal_pull |
| bird_dog_row | Bird Dog Row | none | horizontal_pull |
| block_power_clean | Block Power Clean | none | (owner to decide) |
| block_power_snatch | Block Power Snatch | none | (owner to decide) |
| block_pull_deadlift | Block Pull Deadlift | none | hinge |
| box_squat | Box Squat | none | squat |
| bulgarian_split_squat | Bulgarian Split Squat | none | single_leg_squat |
| chest_supported_row | Chest Supported Row | none | horizontal_pull |
| chin_up | Chin Up | none | vertical_pull |
| clean_pull_from_blocks | Clean Pull From Blocks | none | (owner to decide) |
| contralateral_step_up | Contralateral Step Up | none | lateral_lunge_squat |
| conventional_deadlift | Conventional Deadlift | none | hinge |
| cossack_squat | Cossack Squat | none | lateral_lunge_squat |
| dead_stop_trap_bar_deadlift | Dead Stop Trap Bar Deadlift | none | hinge |
| deficit_push_up | Deficit Push Up | none | horizontal_push |
| dumbbell_bench_press | Dumbbell Bench Press | none | horizontal_push |
| dumbbell_lateral_lunge | Dumbbell Lateral Lunge | none | lateral_lunge_squat |
| dumbbell_pullover_hold | Dumbbell Pullover Hold | none | (owner to decide) |
| dumbbell_push_press | Dumbbell Push Press | none | vertical_push |
| dumbbell_rdl_to_row | Dumbbell RDL To Row | none | hinge |
| dumbbell_split_stance_rdl | Dumbbell Split Stance RDL | none | hinge |
| dumbbell_squat_to_press | Dumbbell Squat To Press | none | squat |
| feet_elevated_inverted_row | Feet Elevated Inverted Row | none | horizontal_pull |
| forty_five_degree_back_extension | Forty Five Degree Back Extension | none | hinge |
| front_foot_elevated_reverse_lunge | Front Foot Elevated Reverse Lunge | none | single_leg_squat |
| full_range_dip | Full Range Dip | none | horizontal_push |
| full_range_dumbbell_shoulder_press | Full Range Dumbbell Shoulder Press | none | vertical_push |
| gap_band_speed_press | Band Speed Press | none | (owner to decide) |
| gap_band_speed_pull | Band Speed Pull | none | (owner to decide) |
| gap_band_speed_squat | Band Speed Squat | none | squat |
| gap_catch_stick_single_leg | Single-Leg Catch and Stick | none | (owner to decide) |
| gap_drop_catch_quarter_squat | Drop-Catch Quarter Squat | none | squat |
| gap_drop_catch_split_stance | Split-Stance Drop-Catch | none | single_leg_squat |
| gap_heavy_triple_box_squat_pre | Box Squat Heavy Triple (pre-season) | none | squat |
| gap_heavy_triple_pin_press_pre | Pin Press Heavy Triple (pre-season) | none | (owner to decide) |
| gap_heavy_triple_trap_bar_pre | Trap-Bar Heavy Triple (pre-season) | none | (owner to decide) |
| gap_iso_wall_press_hold | Wall Press Isometric | none | (owner to decide) |
| gap_isometric_wall_calf_drive | Wall Calf Drive Isometric | none | ankle_foot |
| gap_wall_drive_iso_split | Wall Drive Isometric — Split | none | single_leg_squat |
| hack_squat | Hack Squat | none | squat |
| half_kneeling_cable_high_row | Half Kneeling Cable High Row | none | horizontal_pull |
| half_kneeling_lat_pulldown | Half Kneeling Lat Pulldown | none | vertical_pull |
| hang_high_pull | Hang High Pull | none | (owner to decide) |
| hang_jump_shrug | Hang Jump Shrug | none | (owner to decide) |
| heel_elevated_front_squat | Heel Elevated Front Squat | none | squat |
| hex_bar_deadlift | Hex Bar Deadlift | none | hinge |
| incline_barbell_bench_press | Incline Barbell Bench Press | none | horizontal_push |
| incline_dumbbell_press | Incline Dumbbell Press | none | (owner to decide) |
| isometric_hold_pull_up | Isometric Hold Pull Up | none | vertical_pull |
| landmine_push_press | Landmine Push Press | none | vertical_push |
| lift_45_hyper_sl | Single-Leg 45° Hyper | hinge_squat | hinge |
| lift_anderson_squat | Anderson Squat | hinge_squat | squat |
| lift_atg_lunge | Deep Range Zombie Lunge | hinge_squat | single_leg_squat |
| lift_atg_split_squat | Deep Range Split Squat, Dumbbell | hinge_squat | single_leg_squat |
| lift_band_assisted_vertical_jump | Band-Assisted Vertical Jump | hinge_squat | (owner to decide) |
| lift_band_deadlift | Band-Loaded Deadlift | hinge_squat | hinge |
| lift_banded_pullthrough | Banded Pull-Through | hinge_squat | hinge |
| lift_bb_hip_thrust | Barbell Hip Thrust | hinge_squat | hip_extension |
| lift_block_pull | 2-Inch Block Pull | hinge_squat | (owner to decide) |
| lift_box_jump_depth_drop | Depth Drop → Box Jump | hinge_squat | (owner to decide) |
| lift_box_squat_wide | Wide-Stance Box Squat | hinge_squat | squat |
| lift_chain_deadlift | Chain-Loaded Deadlift | hinge_squat | hinge |
| lift_clean_pull | Clean Pull | hinge_squat | (owner to decide) |
| lift_copenhagen_plank | Copenhagen Adductor Plank | hinge_squat | hip_adduction |
| lift_couch_stretch_loaded | Couch Stretch (Loaded) | hinge_squat | (owner to decide) |
| lift_db_snatch | Single-Arm DB Snatch | hinge_squat | (owner to decide) |
| lift_deficit_deadlift | Deficit Deadlift | hinge_squat | hinge |
| lift_drop_jump_rebound_assisted | Assisted Drop Jump Rebound | hinge_squat | (owner to decide) |
| lift_dynamic_effort_squat | Dynamic-Effort Speed Squat | hinge_squat | squat |
| lift_elephant_walk | Elephant Walk | hinge_squat | (owner to decide) |
| lift_french_contrast_lower | French Contrast Lower Complex | hinge_squat | (owner to decide) |
| lift_ghr | Glute-Ham Raise | hinge_squat | knee_flexion |
| lift_hang_power_clean | Hang Power Clean | hinge_squat | (owner to decide) |
| lift_hang_power_snatch | Hang Power Snatch | hinge_squat | (owner to decide) |
| lift_heavy_sled_march | Heavy Sled March | hinge_squat | (owner to decide) |
| lift_hip_airplane | Hip Airplane | hinge_squat | hip_rotation |
| lift_hip_flexor_iso | Standing Hip-Flexor Iso | hinge_squat | (owner to decide) |
| lift_iso_squat | Three-Phase Iso Squat 3s | hinge_squat | squat |
| lift_jefferson_curl | Slow Standing Back Curl | hinge_squat | hinge |
| lift_jump_shrug | Jump Shrug | hinge_squat | (owner to decide) |
| lift_kb_swing_american | American KB Swing | hinge_squat | hinge |
| lift_kb_swing_russian | Russian KB Swing | hinge_squat | hinge |
| lift_kot_calf_raise | Knee Forward Calf Raise | hinge_squat | ankle_foot |
| lift_kot_sissy_squat | Sissy Squat | hinge_squat | squat |
| lift_nordic_curl_ecc | Nordic Hamstring Eccentric | hinge_squat | knee_flexion |
| lift_overspeed_band_squat_jump | Overspeed Band Squat Jump | hinge_squat | squat |
| lift_patrick_step | Short Range Knee Step Down | hinge_squat | single_leg_squat |
| lift_paused_front_squat | 3s Paused Front Squat | hinge_squat | squat |
| lift_peterson_stepup | Peterson Step-Up | hinge_squat | single_leg_squat |
| lift_rdl_cluster | RDL Cluster | hinge_squat | hinge |
| lift_safety_bar_squat | Safety-Bar Squat | hinge_squat | squat |
| lift_sl_hip_thrust | Single-Leg Hip Thrust | hinge_squat | hip_extension |
| lift_sl_rdl | Single-Leg RDL | hinge_squat | hinge |
| lift_snatch_grip_rdl | Snatch-Grip RDL | hinge_squat | hinge |
| lift_snatch_pull | Snatch Pull | hinge_squat | (owner to decide) |
| lift_split_squat_iso | Iso Split-Squat Hold | hinge_squat | single_leg_squat |
| lift_ssb_good_morning | Safety-Bar Good Morning | hinge_squat | hinge |
| lift_staggered_rdl | Staggered-Stance RDL | hinge_squat | hinge |
| lift_stepup | Backward Step Down Heel Elevated, Dumbbell | hinge_squat | single_leg_squat |
| lift_tempo_back_squat | Tempo Back Squat 5010 | hinge_squat | squat |
| lift_trap_bar_jump | Trap-Bar Jump | hinge_squat | (owner to decide) |
| lift_vmo_leg_ext | Long-Lever VMO Leg Extension | hinge_squat | (owner to decide) |
| mid_thigh_pull | Mid Thigh Pull | none | (owner to decide) |
| offset_farmer_carry | Offset Farmer Carry | none | anti_rotation |
| one_arm_cable_pulldown | One Arm Cable Pulldown | none | vertical_pull |
| overhead_carry | Overhead Carry | none | anti_rotation |
| paused_deep_squat | Paused Deep Squat | none | squat |
| petersen_step_up | Petersen Step Up | none | single_leg_squat |
| physioball_leg_curl | Physioball Leg Curl | none | knee_flexion |
| pin_squat_concentric_only | Pin Squat Concentric Only | none | squat |
| plate_press | Plate Press | none | (owner to decide) |
| power_high_pull | Power High Pull | none | (owner to decide) |
| prone_weighted_reverse_fly | Prone Weighted Reverse Fly | none | (owner to decide) |
| prone_y_t_w_raise | Prone Y T W Raise | none | (owner to decide) |
| pull_up | Pull Up | none | vertical_pull |
| reverse_nordic_curl | Reverse Nordic Curl | none | knee_flexion |
| ring_dip | Ring Dip | none | horizontal_push |
| ring_push_up | Ring Push Up | none | horizontal_push |
| seated_alternating_shoulder_press | Seated Alternating Shoulder Press | none | vertical_push |
| seated_cable_row | Seated Cable Row | none | horizontal_pull |
| single_arm_cable_row | Single Arm Cable Row | none | horizontal_pull |
| single_arm_dumbbell_bench_press | Single Arm Dumbbell Bench Press | none | horizontal_push |
| single_leg_back_extension | Single Leg Back Extension | none | hinge |
| single_leg_wall_sit | Single Leg Wall Sit | none | squat |
| slant_board_jefferson_curl | Slow Standing Back Curl on Slant Board | none | hinge |
| slideboard_leg_curl | Slideboard Leg Curl | none | knee_flexion |
| slider_reverse_lunge | Slider Reverse Lunge | none | single_leg_squat |
| split_stance_landmine_push_press | Split Stance Landmine Push Press | none | single_leg_squat |
| step_up | Step Up | none | single_leg_squat |
| straight_arm_dumbbell_pullover | Straight Arm Dumbbell Pullover | none | (owner to decide) |
| trap_bar_carry | Trap Bar Carry | none | anti_rotation |
| trap_three_raise | Trap Three Raise | none | (owner to decide) |
| walking_lunge | Walking Lunge | none | single_leg_squat |
| wall_sit | Wall Sit | none | squat |
| wide_grip_pull_up | Wide Grip Pull Up | none | vertical_pull |

## 5. Progress toward goals — what exists today

**What exists:**
- **Verified maxes:** confirmed from logged sets, with working weights from them (`src/lib/lift/verifiedMax.ts`).
- **Plateau check:** 3 sessions without a new best suggests a swap (`liftPlateau`).
- **Weight-room standards:** 5 families — joint armour, posterior armour, relative strength, rotational power, arm speed. Each has Standard / Elite / World Class tiers, 24 marks in all (`src/lib/hammer/standards/catalog.ts`, `evaluate.ts`, `attempts.ts`). Tables `wk_standard_awards` and `wk_standard_attempts` have **0 rows** so far.
- **Combine:** `combine_sessions` and `combine_results` exist, with 0 results.
- **Per-athlete baselines:** `athlete_baseline_history` (144 rows) and `athlete_baseline_alerts`.
- **Other records:** `tex_vision_personal_bests`; speed personal bests on the speed card; "What your records show" on The General (`src/lib/progress/recordsShow.ts`); goals in `athlete_body_goals` and `athlete_context`.

**What's missing for a full strength and power roadmap:**
1. Marks that can be earned in plans. The tib, calf and Nordic standards can't be reached because the planner never prescribes those exercises.
2. A standard test battery on a set schedule, for example every 6–8 weeks:
   - lower-body strength (trap-bar or squat estimated max)
   - single-leg strength
   - hamstring (Nordic break angle or leg-curl reps)
   - adductor/abductor squeeze
   - jumps (vertical, broad)
   - 10-yard and 30-yard sprint
   - med-ball rotational throw
   - bat speed and throw velocity
3. Bodyweight-relative numbers and age-band norms, so a 14-year-old's score has a target.
4. A goal timeline: from today's mark, to the next tier, to a goal date, with a trend line per test.
5. One progress page joining verified maxes, standards, combine and personal bests, which are separate today.
6. Left-vs-right comparison for single-leg tests. Side data exists in logs, but no benchmark uses it.
