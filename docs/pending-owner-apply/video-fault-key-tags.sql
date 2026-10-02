-- STAGED, NOT APPLIED. Owner applies. Adds the analysis's own fault keys as video
-- correction tags so a tagged video can be matched to the exact fault the analysis emits.
-- Additive only: ON CONFLICT DO NOTHING; no existing row changes. New rows INACTIVE until owner review.
-- Snapshot first: create table if not exists video_tag_taxonomy_snapshot_20261002 as select * from public.video_tag_taxonomy;
insert into public.video_tag_taxonomy (layer, key, label, skill_domain, sport, description, active) values
  ('correction', 'hip_load_back_leg_not_balanced', 'hip load back leg not balanced', 'hitting', 'both', 'Phase 1 — Create Balance', false),
  ('correction', 'back_knee_straightened_fail', 'back knee straightened fail', 'hitting', 'both', 'Phase 1 — Create Balance', false),
  ('correction', 'back_hip_socket_hold_fail', 'back hip socket hold fail', 'hitting', 'both', 'Phase 2 — Gather', false),
  ('correction', 'front_heel_not_down_at_landing', 'front heel not down at landing', 'hitting', 'both', 'Phase 3 — Load by Stride', false),
  ('correction', 'hands_below_back_elbow_at_heel_landing', 'hands below back elbow at heel landing', 'hitting', 'both', 'Phase 3 — Load by Stride', false),
  ('correction', 'stride_body_gained_ground', 'stride body gained ground', 'hitting', 'both', 'Phase 3 — Load by Stride', false),
  ('correction', 'hands_pass_elbow_early', 'hands pass elbow early', 'hitting', 'both', 'Phase 4 — Hitter''s Move', false),
  ('correction', 'post_landing_hip_drift_fail', 'post landing hip drift fail', 'hitting', 'both', 'Phase 4 — Hitter''s Move', false),
  ('correction', 'p1_load_not_used', 'p1 load not used', 'hitting', 'both', 'Phase 4 — Hitter''s Move', false),
  ('correction', 'head_rises_before_contact', 'head rises before contact', 'hitting', 'both', 'Phase 4 — Hitter''s Move', false),
  ('correction', 'head_discipline_head_past_com', 'head discipline head past com', 'hitting', 'both', 'Phase 4 — Hitter''s Move', false),
  ('correction', 'chest_open_at_landing', 'chest open at landing', 'pitching', 'baseball', 'Landing', false),
  ('correction', 'hang_at_peak_lift', 'hang at peak lift', 'pitching', 'baseball', 'Leg lift', false),
  ('correction', 'not_stacked_at_release', 'not stacked at release', 'pitching', 'baseball', 'Release', false),
  ('correction', 'head_outside_base_at_landing', 'head outside base at landing', 'pitching', 'baseball', 'Landing', false),
  ('correction', 'glove_flies_open', 'glove flies open', 'pitching', 'baseball', 'Landing to release', false),
  ('correction', 'drag_line_long_or_crooked', 'drag line long or crooked', 'pitching', 'baseball', 'Release to finish', false),
  ('correction', 'eyes_off_target_at_peak_lift', 'eyes off target at peak lift', 'pitching', 'baseball', 'Leg lift', false),
  ('correction', 'early_shoulder_rotation', 'early shoulder rotation', 'throwing', 'both', 'Landing', false),
  ('correction', 'shoulders_not_aligned', 'shoulders not aligned', 'throwing', 'both', 'Landing', false),
  ('correction', 'back_leg_not_facing_target', 'back leg not facing target', 'throwing', 'both', 'Landing', false),
  ('correction', 'windup_not_sprinter_position', 'windup not sprinter position', 'pitching', 'softball', 'Wind-up', false),
  ('correction', 'no_drive_leg_extension', 'no drive leg extension', 'pitching', 'softball', 'Stride', false),
  ('correction', 'stride_foot_off_power_line', 'stride foot off power line', 'pitching', 'softball', 'Stride foot contact', false),
  ('correction', 'arm_path_away_from_body', 'arm path away from body', 'pitching', 'softball', 'Stride to acceleration', false),
  ('correction', 'back_leg_off_power_line', 'back leg off power line', 'pitching', 'softball', 'Acceleration', false)
on conflict do nothing;
