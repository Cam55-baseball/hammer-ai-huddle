# Video tag coverage — 2026-09-02

Two different problems, kept separate on purpose.

## (a) Tags unreachable by code — BUGS, now fixed

Before this pass, 87 active tags could never be matched by any code path: no
analysis, practice or game surface ever produced their key. Causes and fixes:

| Cause | Tags affected | Fix |
|---|---|---|
| Suggestions were blocked unless a movement/correction layer was populated, so context-only callers matched nothing | all 42 context tags | `useVideoSuggestions` now runs when **any** layer has keys |
| Recommendations only ran for hitting/pitching/throwing | fielding + base running (54) | `SUPPORTED` widened; game data now drives both |
| Nothing produced result-layer keys | 41 result tags | movement→result map in `analysisFeedbackToTaxonomy`, plus game outcomes |
| No surface read game data at all | fielding/pitching/hitting/base-running game tags | new `gameOutcomesToTaxonomy.ts` + `GameVideoRecommendations` on the game overview |
| Movements with more than one honest answer only emitted one correction | 6 correction tags | `MOVEMENT_TO_EXTRA_CORRECTIONS` |

**Unreachable tags remaining: 0 of 217.** Every active tag in every layer can now be produced by at least one code path.

## (b) Tags with no video — CONTENT GAPS, nothing to fix in code

163 of 217 active tags have no video attached. Nothing was retagged and no tag
was created to hide this. What to film, by domain and layer:

### base running — 2 tags with no video

**correction** (1)

- `first_step_quickness` — First-step quickness

**movement pattern** (1)

- `slow_first_step` — Slow first step

### fielding — 67 tags with no video

**correction** (18)

- `c_beat_ball_with_hips` — Beat the ball with the hips
- `c_block_angle_to_plate` — Block angle back to the plate
- `c_quiet_receiving` — Quiet receiving hands
- `c_replace_feet_on_throw` — Replace the feet on the throw
- `clean_glove_path` — Clean glove path
- `fb_stretch_after_read` — Stretch after the read
- `fb_work_through_short_hop` — Work through the short hop
- `first_step_quickness` — First-step quickness
- `mi_feed_from_glove_side` — Feed from the glove side
- `mi_field_through_the_ball` — Field through the ball
- `mi_underhand_inside_range` — Underhand inside your range
- `of_banana_route` — Banana route to the line
- `of_drop_step_on_read` — Drop step on the read
- `of_play_through_the_ball` — Play through the ball
- `quick_exchange` — Quick exchange
- `reaction_drills` — Reaction drills
- `tb_attack_slow_roller` — Attack the slow roller
- `tb_work_through_the_hop` — Work through the hop

**movement pattern** (27)

- `arm_lag` — Arm lag
- `c_block_chest_up` — Chest up in the block
- `c_late_block_drop` — Late to drop into the block
- `c_slow_block_recovery` — Slow block recovery
- `c_stabs_at_receiving` — Stabs at the receive
- `c_wide_secondary` — Secondary stance too wide
- `fb_early_stretch` — Stretches before the read
- `fb_late_scoop_glove` — Late glove on the scoop
- `fd_backhand_reach_late` — Late backhand reach
- `fd_head_lifts_early` — Head lifts early
- `fd_high_hands_setup` — Hands too high in setup
- `fd_no_pre_pitch_hop` — No pre-pitch hop
- `fd_stiff_lower_half` — Stiff lower half
- `glove_drift` — Glove drift
- `late_exchange` — Late exchange
- `mi_feed_from_wrong_hip` — Feeds from the wrong hip
- `mi_flat_glove_approach` — Flat glove approach
- `mi_late_pivot_at_bag` — Late pivot at the bag
- `mi_slap_charge_late` — Late charge on the slap
- `of_first_step_drift_in` — First step drifts in
- `of_late_drop_step` — Late drop step
- `of_no_throwing_momentum` — No momentum into the throw
- `of_rounded_route` — Rounded route
- `poor_footwork_angle` — Poor footwork angle
- `slow_first_step` — Slow first step
- `tb_backs_up_in_between_hop` — Backs up on the in-between hop
- `tb_no_charge_slow_roller` — Does not charge the slow roller

**result** (16)

- `booted_ball` — Booted ball
- `c_bottom_strike_lost` — Loses the bottom strike
- `c_missed_block_away` — Missed block to the side
- `c_passed_ball` — Passed ball
- `double_clutch` — Double clutch
- `fb_missed_pick` — Missed pick
- `fb_pulled_off_bag` — Pulled off the bag
- `late_throw` — Late throw
- `mi_dp_turn_late` — Double play turn late
- `mi_feed_offline` — Offline feed
- `of_ball_over_head` — Ball gets over the head
- `of_late_to_cutoff` — Late to the cutoff
- `of_misplayed_wall_ball` — Misplayed ball off the wall
- `offline_throw` — Offline throw
- `tb_eaten_by_hop` — Eaten up by the hop
- `tb_slow_roller_late_throw` — Slow roller — late throw

**context** (6)

- `fd_bunt_defense` — Bunt defense
- `fd_first_and_third` — First and third
- `fd_infield_in` — Infield in
- `fd_runners_on` — Runners on base
- `fd_slap_defense` — Slap defense
- `fd_wet_or_turf` — Wet grass / turf surface

### hitting — 2 tags with no video

**result** (1)

- `ground_ball_middle` — Ground ball up the middle

**context** (1)

- `low_pitch` — Low pitch

### pitching — 65 tags with no video

**correction** (15)

- `bb_block_with_front_leg` — Block with the front leg
- `bb_decelerate_through_finish` — Decelerate through the finish
- `bb_delay_trunk_rotation` — Delay trunk rotation
- `bb_finish_out_front` — Finish out front
- `bb_repeat_release_point` — Repeat the release point
- `bb_stay_closed_longer` — Stay closed longer
- `bb_stride_to_power_line` — Stride to the power line
- `maintain_posture` — Maintain posture
- `sb_block_with_plant_leg` — Block with the plant leg
- `sb_drive_down_power_line` — Drive down the power line
- `sb_finish_brush_contact` — Finish with brush contact
- `sb_hold_k_position` — Hold the K position
- `sb_repeat_release_window` — Repeat the release window
- `sb_snap_out_front` — Snap out front
- `sb_stay_closed_through_whip` — Stay closed through the whip

**movement pattern** (19)

- `bb_arm_path_late` — Late arm path into slot
- `bb_front_leg_collapse` — Front leg collapses at landing
- `bb_front_side_flyout` — Front side flies open
- `bb_hip_shoulder_sep_loss` — Loses hip/shoulder separation
- `bb_leg_lift_unbalanced` — Leg lift loses balance
- `bb_poor_deceleration` — Poor deceleration pattern
- `bb_release_point_drift` — Release point drifts
- `bb_stride_direction_off` — Stride lands off the power line
- `bb_trunk_rotation_early` — Trunk rotates early
- `early_extension` — Early extension
- `sb_brush_contact_missed` — Misses brush contact
- `sb_k_position_late` — Late to K position
- `sb_plant_leg_collapse` — Plant leg collapses
- `sb_replant_drift` — Replant drifts off line
- `sb_short_stride` — Short stride
- `sb_shoulders_open_early` — Shoulders open early
- `sb_snap_late` — Late wrist snap
- `sb_weak_drive_push` — Weak drive off the mound
- `sb_whip_arm_early` — Whips the arm early

**result** (14)

- `bb_arm_side_miss` — Misses arm side
- `bb_bounced_pitch` — Bounces the pitch
- `bb_flat_fastball_plane` — Flat fastball plane
- `bb_glove_side_miss` — Misses glove side
- `bb_hung_breaking_ball` — Hangs the breaking ball
- `bb_miss_high` — Misses high
- `bb_noncompetitive_strike` — Non-competitive strike
- `sb_arm_side_miss` — Misses arm side
- `sb_bounced_pitch` — Bounces the pitch
- `sb_change_telegraphed` — Changeup telegraphed
- `sb_drop_hangs` — Dropball hangs
- `sb_rise_flattens` — Riseball flattens
- `sb_screw_backs_up` — Screwball backs up
- `sb_spin_inconsistent` — Inconsistent spin

**context** (17)

- `bb_breaking_ball` — Breaking ball
- `bb_bullpen` — Bullpen / flat ground
- `bb_changeup` — Changeup
- `bb_fastball` — Fastball
- `bb_from_stretch` — From the stretch
- `bb_from_windup` — From the windup
- `bb_high_pitch_count` — High pitch count
- `bb_runners_on` — Runners on base
- `sb_bullpen` — Bullpen / flat ground
- `sb_changeup` — Changeup
- `sb_curveball` — Curveball
- `sb_dropball` — Dropball
- `sb_fastball` — Fastball
- `sb_high_pitch_count` — High pitch count
- `sb_riseball` — Riseball
- `sb_runners_on` — Runners on base
- `sb_screwball` — Screwball

### throwing — 27 tags with no video

**correction** (7)

- `clean_arm_path` — Clean arm path
- `th_align_feet_to_target` — Align feet to the target
- `th_crow_hop_through_target` — Crow hop through the target
- `th_four_seam_exchange` — Four-seam quick exchange
- `th_glove_to_chest_transfer` — Transfer at the chest
- `th_shorten_arm_circle` — Shorten the arm circle
- `th_stay_online_finish` — Stay online through the finish

**movement pattern** (9)

- `arm_lag` — Arm lag
- `short_arm` — Short arm action
- `th_across_body` — Throws across the body
- `th_feet_misaligned` — Feet misaligned to target
- `th_late_glove_break` — Late glove break
- `th_long_arm_action` — Long arm action
- `th_low_elbow_slot` — Elbow drops below slot
- `th_no_crow_hop` — No crow hop / momentum
- `th_slow_transfer` — Slow glove-to-hand transfer

**result** (6)

- `th_late_to_bag` — Late to the bag
- `th_offline_arm_side` — Offline arm side
- `th_offline_glove_side` — Offline glove side
- `th_sailed_high` — Sails high
- `th_short_hopped` — Short hops the receiver
- `th_slow_pop_time` — Slow pop time

**context** (5)

- `th_catcher_throw_down` — Catcher throw down
- `th_double_play_turn` — Double play turn
- `th_infield_feed` — Infield feed
- `th_long_toss` — Long toss
- `th_outfield_relay` — Outfield relay / cutoff

