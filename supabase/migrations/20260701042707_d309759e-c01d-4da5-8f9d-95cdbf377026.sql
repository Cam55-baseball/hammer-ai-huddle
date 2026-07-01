
-- Add sequence_role to organize elite full-body lift template ordering.
ALTER TABLE public.wk_prescriptions
  ADD COLUMN IF NOT EXISTS sequence_role TEXT;

CREATE INDEX IF NOT EXISTS wk_rx_seq_role_idx
  ON public.wk_prescriptions (user_id, plan_date, sequence_role);

-- Seed elite reference movements (idempotent on slug).
INSERT INTO public.wk_movement_catalog
  (slug, name, category, pattern, variant, sport_scope, min_training_age_years, cns_cost, cue, why_prescribed, contraindications, regression_slug, progression_slug, default_sets, default_reps, default_tempo, default_load_pct)
VALUES
  ('crossover_symmetry_full', 'Crossover Symmetry — Full List', 'arm_care', 'mobility', NULL, 'both', 0, 0, 'Iron-scap, Y-T-W-L, 90/90 ER/IR — full band flow, slow tempo.', 'Non-negotiable shoulder prep. Every session opens here.', '{}', NULL, NULL, 1, 1, NULL, NULL),
  ('jband_full_chart',       'JBand — Full Arm Care Chart',    'arm_care', 'mobility', NULL, 'both', 0, 0, 'Complete JBand series: rows, ER/IR, diagonals, deceleration.', 'Throwing-arm durability. Owed daily, non-negotiable.', '{}', NULL, NULL, 1, 1, NULL, NULL),
  ('trap_bar_trunk_twist',   'Trap-Bar Trunk Twist',            'trunk', 'rotational', NULL, 'both', 1, 1, 'Trap bar loaded, tall spine, rotate under control 5/side.', 'Loaded rotation primer — wakes obliques + preps swing plane.', '{"low_back_acute","oblique_strain"}', NULL, NULL, 1, 10, NULL, NULL),
  ('heavy_russian_twist',    'Heavy Russian Twist',             'trunk', 'rotational', NULL, 'both', 1, 1, 'DB or plate, controlled rotation, no lumbar spin.', 'Loaded trunk finisher — locks rotational strength gained above.', '{"low_back_acute"}', NULL, NULL, 1, 10, NULL, NULL),
  ('sa_db_chest_press',      'Single-Arm DB Chest Press',       'unilateral_push', 'push', NULL, 'both', 1, 2, 'One DB, brace hard to resist rotation, press to full lockout.', 'Anti-rotation press — bulletproofs the shoulder + core coupling.', '{"shoulder_acute"}', 'db_bench', NULL, 2, 3, '3-0-X-0', NULL),
  ('sa_standing_cable_row',  'Single-Arm Standing Cable Row',   'unilateral_pull', 'pull', NULL, 'both', 0, 1, 'Split stance, drive elbow to hip, resist rotation, full stretch.', 'Standing pull under rotation — throwing/decel chain.', '{}', NULL, NULL, 2, 3, '2-0-X-1', NULL),
  ('renegade_row',           'Renegade Row',                    'unilateral_pull', 'pull', NULL, 'both', 1, 2, 'Plank on DBs, row one hand without hip drop.', 'Anti-rotation pull + shoulder stability + trunk.', '{"shoulder_acute","wrist_acute"}', 'db_row_bench', NULL, 1, 5, NULL, NULL),
  ('weighted_pullup_full',   'Weighted Pull-Up (Full ROM)',     'compound', 'pull', 'concentric', 'both', 2, 2, 'Dead-hang start, chin cleanly over bar, controlled 3s descent.', 'Vertical pull — direct lat + scap strength for throwers.', '{"shoulder_acute","elbow_acute"}', 'lat_pulldown', NULL, 2, 3, '3-0-X-1', NULL),
  ('lateral_db_step_up',     'Lateral DB Step-Up',              'unilateral_lower', 'squat', NULL, 'both', 0, 2, 'DBs at side, step laterally onto box, drive through mid-foot.', 'Frontal-plane single-leg strength — steal jumps + defensive range.', '{"knee_acute","ankle_acute"}', 'box_step_up', NULL, 2, 3, NULL, NULL),
  ('slide_lunge',            'Slide Lunge (Slideboard/Valslide)','unilateral_lower', 'squat', NULL, 'both', 1, 2, 'Rear foot on slider, drop hamstring to calf, drive up.', 'Groin + adductor eccentric — sliding, fielding, deceleration.', '{"knee_acute","hip_acute","groin_strain"}', 'reverse_lunge', NULL, 2, 3, '3-0-1-0', NULL),
  ('kot_lunge',              'Knees-Over-Toes Lunge',           'unilateral_lower', 'squat', NULL, 'both', 0, 2, 'Front-foot flat, drop back knee under torso, full quad stretch, drive up.', 'ATG-style unilateral — knee durability + full ROM strength.', '{"knee_surgery_lt_6mo"}', 'reverse_lunge', NULL, 2, 3, '3-0-1-0', NULL),
  ('sl_deadlift_fat_grips',  'Single-Leg Deadlift (Fat Grips)', 'unilateral_lower', 'hinge', NULL, 'both', 1, 2, 'Fat-grip DBs, hinge on one leg, back foot free, chase depth.', 'Posterior chain unilateral + grip loading — hamstring health + forearm.', '{"low_back_acute","hamstring_strain"}', 'rdl_db', NULL, 2, 3, '3-0-X-0', NULL),
  ('landmine_row_to_press',  'Landmine Row-to-Press',           'unilateral_push', 'push', NULL, 'both', 1, 2, 'Row landmine bar to hip, then press overhead in one flow.', 'Combined pull→press pattern — full posterior + delt integration.', '{"shoulder_acute"}', NULL, NULL, 2, 3, NULL, NULL),
  ('standing_cable_hip_flexor','Standing Cable Hip Flexor',     'carry_antirotation', 'mobility', NULL, 'both', 0, 1, 'Cable at ankle, drive knee up under control, tall posture.', 'Active hip flexion strength — sprint knee drive.', '{}', NULL, NULL, 2, 3, NULL, NULL),
  ('waiter_carry',           'Waiter Carry',                    'carry_antirotation', 'mobility', NULL, 'both', 0, 1, 'DB pressed overhead, tall ribcage, walk 20s per side.', 'Overhead stability + trunk anti-lateral flexion. Shoulder gold.', '{"shoulder_acute"}', NULL, NULL, 2, 1, '20s', NULL)
ON CONFLICT (slug) DO NOTHING;
