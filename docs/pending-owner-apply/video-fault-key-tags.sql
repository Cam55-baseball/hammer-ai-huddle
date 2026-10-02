-- STAGED, NOT APPLIED. Adds the analysis's own fault keys as video
-- correction tags so a tagged video can be matched to the exact fault the analysis emits.
-- Additive only: ON CONFLICT DO NOTHING; no existing row changes. These rows are
-- ACTIVE per the owner's explicit 2026-10-02 instruction, but this script is
-- NOT EXECUTED under the project's higher-priority no-live-changes rule.
-- Before a separately authorized application: export a full durable snapshot
-- of public.video_tag_taxonomy, verify it, then apply this data-only insert.
-- There are 29 sport/domain rows for 27 distinct keys in the analyzer, not 26.
insert into public.video_tag_taxonomy (layer, key, label, skill_domain, sport, description, active) values
  ('correction', 'hip_load_back_leg_not_balanced', 'hip load back leg not balanced', 'hitting', 'both', 'Phase 1 — Create Balance', true),
  ('correction', 'back_knee_straightened_fail', 'back knee straightened fail', 'hitting', 'both', 'Phase 1 — Create Balance', true),
  ('correction', 'back_hip_socket_hold_fail', 'back hip socket hold fail', 'hitting', 'both', 'Phase 2 — Gather', true),
  ('correction', 'front_heel_not_down_at_landing', 'front heel not down at landing', 'hitting', 'both', 'Phase 3 — Load by Stride', true),
  ('correction', 'hands_below_back_elbow_at_heel_landing', 'hands below back elbow at heel landing', 'hitting', 'both', 'Phase 3 — Load by Stride', true),
  ('correction', 'stride_body_gained_ground', 'stride body gained ground', 'hitting', 'both', 'Phase 3 — Load by Stride', true),
  ('correction', 'hands_pass_elbow_early', 'hands pass elbow early', 'hitting', 'both', 'Phase 4 — Hitter''s Move', true),
  ('correction', 'post_landing_hip_drift_fail', 'post landing hip drift fail', 'hitting', 'both', 'Phase 4 — Hitter''s Move', true),
  ('correction', 'p1_load_not_used', 'p1 load not used', 'hitting', 'both', 'Phase 4 — Hitter''s Move', true),
  ('correction', 'head_rises_before_contact', 'head rises before contact', 'hitting', 'both', 'Phase 4 — Hitter''s Move', true),
  ('correction', 'head_discipline_head_past_com', 'head discipline head past com', 'hitting', 'both', 'Phase 4 — Hitter''s Move', true),
  ('correction', 'lead_elbow_bends_in_swing', 'lead elbow bends in swing', 'hitting', 'both', 'Phase 4 — Hitter''s Move', true),
  ('correction', 'early_shoulder_rotation', 'early shoulder rotation', 'hitting', 'both', 'Phase 3 — Load by Stride', true),
  ('correction', 'early_shoulder_rotation', 'early shoulder rotation', 'pitching', 'baseball', 'Landing', true),
  ('correction', 'chest_open_at_landing', 'chest open at landing', 'pitching', 'baseball', 'Landing', true),
  ('correction', 'hang_at_peak_lift', 'hang at peak lift', 'pitching', 'baseball', 'Leg lift', true),
  ('correction', 'not_stacked_at_release', 'not stacked at release', 'pitching', 'baseball', 'Release', true),
  ('correction', 'head_outside_base_at_landing', 'head outside base at landing', 'pitching', 'baseball', 'Landing', true),
  ('correction', 'glove_flies_open', 'glove flies open', 'pitching', 'baseball', 'Landing to release', true),
  ('correction', 'drag_line_long_or_crooked', 'drag line long or crooked', 'pitching', 'baseball', 'Release to finish', true),
  ('correction', 'eyes_off_target_at_peak_lift', 'eyes off target at peak lift', 'pitching', 'baseball', 'Leg lift', true),
  ('correction', 'early_shoulder_rotation', 'early shoulder rotation', 'throwing', 'both', 'Landing', true),
  ('correction', 'shoulders_not_aligned', 'shoulders not aligned', 'throwing', 'both', 'Landing', true),
  ('correction', 'back_leg_not_facing_target', 'back leg not facing target', 'throwing', 'both', 'Landing', true),
  ('correction', 'windup_not_sprinter_position', 'windup not sprinter position', 'pitching', 'softball', 'Wind-up', true),
  ('correction', 'no_drive_leg_extension', 'no drive leg extension', 'pitching', 'softball', 'Stride', true),
  ('correction', 'stride_foot_off_power_line', 'stride foot off power line', 'pitching', 'softball', 'Stride foot contact', true),
  ('correction', 'arm_path_away_from_body', 'arm path away from body', 'pitching', 'softball', 'Stride to acceleration', true),
  ('correction', 'back_leg_off_power_line', 'back leg off power line', 'pitching', 'softball', 'Acceleration', true)
on conflict do nothing;
