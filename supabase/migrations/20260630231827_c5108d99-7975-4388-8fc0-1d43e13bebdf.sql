
-- =========================================================
-- HAMMER WORKOUT & SPEED — ELITE PERSONALIZATION SCHEMA
-- =========================================================

-- Shared updated_at trigger (idempotent)
CREATE OR REPLACE FUNCTION public.wk_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ---------- wk_periodization_blocks ----------
CREATE TABLE public.wk_periodization_blocks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  phase TEXT NOT NULL UNIQUE, -- 'os_q1' | 'os_q2' | 'os_q3' | 'os_q4' | 'in_season' | 'post_season'
  display_name TEXT NOT NULL,
  compound_style TEXT NOT NULL, -- 'double_eccentric' | 'eccentric' | 'concentric'
  supplemental_style TEXT NOT NULL, -- 'kot' | 'functional_patterning' | 'mixed'
  speed_cadence_hours INTEGER NOT NULL DEFAULT 48,
  cross_sport_cadence TEXT NOT NULL DEFAULT 'post_practice_daily',
  compound_min_sets INTEGER NOT NULL DEFAULT 2,
  compound_max_sets INTEGER NOT NULL DEFAULT 5,
  compound_min_reps INTEGER NOT NULL DEFAULT 2,
  compound_max_reps INTEGER NOT NULL DEFAULT 5,
  cns_unit_cap INTEGER NOT NULL DEFAULT 3,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.wk_periodization_blocks TO authenticated;
GRANT ALL ON public.wk_periodization_blocks TO service_role;
ALTER TABLE public.wk_periodization_blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wk_blocks_read_all_authed" ON public.wk_periodization_blocks
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "wk_blocks_admin_write" ON public.wk_periodization_blocks
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER wk_blocks_touch BEFORE UPDATE ON public.wk_periodization_blocks
  FOR EACH ROW EXECUTE FUNCTION public.wk_touch_updated_at();

-- ---------- wk_movement_catalog ----------
CREATE TABLE public.wk_movement_catalog (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category TEXT NOT NULL, -- 'compound' | 'kot' | 'functional_patterning' | 'bat_speed' | 'speed_lab' | 'conditioning' | 'cross_sport'
  pattern TEXT, -- 'squat' | 'hinge' | 'push' | 'pull' | 'rotational' | 'sprint' | 'plyo' | 'mobility' | 'aerobic'
  variant TEXT, -- 'double_eccentric' | 'eccentric' | 'concentric' | 'overload' | 'underload' | NULL
  sport_scope TEXT NOT NULL DEFAULT 'both', -- 'baseball' | 'softball' | 'both'
  position_scope TEXT[] DEFAULT NULL, -- NULL = all positions; else array
  min_training_age_years NUMERIC NOT NULL DEFAULT 0,
  min_competition_level TEXT, -- e.g. 'youth_8u', 'hs_varsity', 'pro' — null = no gate
  cns_cost INTEGER NOT NULL DEFAULT 1, -- 0..3
  cue TEXT NOT NULL,
  why_prescribed TEXT NOT NULL,
  contraindications TEXT[] DEFAULT '{}'::text[], -- injury slugs that block this movement
  regression_slug TEXT,
  progression_slug TEXT,
  demo_video_url TEXT,
  default_sets INTEGER,
  default_reps INTEGER,
  default_tempo TEXT, -- e.g. '5-0-1-0' or '3-1-X-1'
  default_load_pct INTEGER, -- of 1RM when applicable
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.wk_movement_catalog TO authenticated;
GRANT ALL ON public.wk_movement_catalog TO service_role;
ALTER TABLE public.wk_movement_catalog ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wk_catalog_read_all_authed" ON public.wk_movement_catalog
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "wk_catalog_admin_write" ON public.wk_movement_catalog
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER wk_catalog_touch BEFORE UPDATE ON public.wk_movement_catalog
  FOR EACH ROW EXECUTE FUNCTION public.wk_touch_updated_at();
CREATE INDEX wk_catalog_category_idx ON public.wk_movement_catalog (category);
CREATE INDEX wk_catalog_sport_idx ON public.wk_movement_catalog (sport_scope);

-- ---------- wk_prescriptions ----------
CREATE TABLE public.wk_prescriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_date DATE NOT NULL,
  slot TEXT NOT NULL, -- 'lift' | 'speed' | 'bat_speed' | 'conditioning' | 'cross_sport' | 'supplemental'
  sequence_order INTEGER NOT NULL DEFAULT 0,
  movement_slug TEXT NOT NULL, -- references wk_movement_catalog.slug (loose ref)
  movement_name TEXT NOT NULL,
  phase TEXT NOT NULL, -- snapshot of periodization phase at generation
  sets INTEGER,
  reps INTEGER,
  tempo TEXT,
  load_pct INTEGER,
  cns_cost INTEGER NOT NULL DEFAULT 1,
  cns_clamped BOOLEAN NOT NULL DEFAULT false,
  substituted_from_slug TEXT,
  substitution_reason TEXT,
  why_payload JSONB NOT NULL DEFAULT '{}'::jsonb, -- {phase, training_age, cns, skill_goal, reductions[], etc}
  status TEXT NOT NULL DEFAULT 'planned', -- 'planned' | 'completed' | 'skipped'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wk_prescriptions TO authenticated;
GRANT ALL ON public.wk_prescriptions TO service_role;
ALTER TABLE public.wk_prescriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wk_rx_owner_all" ON public.wk_prescriptions
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER wk_rx_touch BEFORE UPDATE ON public.wk_prescriptions
  FOR EACH ROW EXECUTE FUNCTION public.wk_touch_updated_at();
CREATE INDEX wk_rx_user_date_idx ON public.wk_prescriptions (user_id, plan_date);

-- ---------- wk_session_logs ----------
CREATE TABLE public.wk_session_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prescription_id UUID REFERENCES public.wk_prescriptions(id) ON DELETE CASCADE,
  plan_date DATE NOT NULL,
  movement_slug TEXT NOT NULL,
  sets_completed INTEGER,
  reps_completed INTEGER[],
  load_used NUMERIC,
  rpe NUMERIC, -- 1..10
  bar_feel TEXT, -- 'crisp' | 'grindy' | 'slow'
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wk_session_logs TO authenticated;
GRANT ALL ON public.wk_session_logs TO service_role;
ALTER TABLE public.wk_session_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wk_logs_owner_all" ON public.wk_session_logs
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER wk_logs_touch BEFORE UPDATE ON public.wk_session_logs
  FOR EACH ROW EXECUTE FUNCTION public.wk_touch_updated_at();
CREATE INDEX wk_logs_user_date_idx ON public.wk_session_logs (user_id, plan_date);

-- ---------- wk_cns_ledger ----------
CREATE TABLE public.wk_cns_ledger (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ledger_date DATE NOT NULL,
  units_spent INTEGER NOT NULL DEFAULT 0,
  units_cap INTEGER NOT NULL DEFAULT 3,
  breakdown JSONB NOT NULL DEFAULT '{}'::jsonb, -- {speed:1, bat_speed:1, lift:1}
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, ledger_date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wk_cns_ledger TO authenticated;
GRANT ALL ON public.wk_cns_ledger TO service_role;
ALTER TABLE public.wk_cns_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wk_cns_owner_all" ON public.wk_cns_ledger
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER wk_cns_touch BEFORE UPDATE ON public.wk_cns_ledger
  FOR EACH ROW EXECUTE FUNCTION public.wk_touch_updated_at();

-- ---------- wk_recovery_acks ----------
CREATE TABLE public.wk_recovery_acks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ack_date DATE NOT NULL,
  reduction_reason TEXT NOT NULL, -- 'sleep' | 'cns' | 'heat' | 'game_today' | 'mixed'
  reduction_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  acknowledged_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, ack_date, reduction_reason)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wk_recovery_acks TO authenticated;
GRANT ALL ON public.wk_recovery_acks TO service_role;
ALTER TABLE public.wk_recovery_acks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wk_ack_owner_all" ON public.wk_recovery_acks
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ---------- Seed default periodization blocks ----------
INSERT INTO public.wk_periodization_blocks
  (phase, display_name, compound_style, supplemental_style, speed_cadence_hours, cross_sport_cadence, compound_min_sets, compound_max_sets, compound_min_reps, compound_max_reps, cns_unit_cap, notes)
VALUES
  ('os_q1',     'Offseason Q1 — Strength & Capacity', 'double_eccentric', 'kot',                   48, 'post_practice_daily', 3, 5, 3, 5, 4, 'Foundation. Double-eccentric compounds + KOT supplementals pre-practice. Max recovery support.'),
  ('os_q2',     'Offseason Q2 — Power Build',         'double_eccentric', 'kot',                   48, 'post_practice_daily', 3, 5, 2, 5, 4, 'Carry-over from Q1. Begin progressing KOT depth/load.'),
  ('os_q3',     'Offseason Q3 — Elastic Transfer',    'eccentric',        'functional_patterning', 72, 'post_practice_daily', 2, 5, 2, 4, 3, 'Eccentric compounds + FP. Speed every 72h. Spec transfer to sport begins.'),
  ('os_q4',     'Offseason Q4 — Sport Sharpen',       'eccentric',        'functional_patterning', 72, 'post_practice_daily', 2, 4, 2, 4, 3, 'Final ramp before in-season. FP holds, speed q72h, conditioning ramps.'),
  ('in_season', 'In-Season — Strength Primer',        'concentric',       'functional_patterning', 96, 'daily',               2, 3, 2, 3, 2, 'Concentric compounds as strength primer (NOT hypertrophy). FP pre-pregame. Speed every 96h. Daily cross-sport conditioning built around inning-restart and base repeatability.'),
  ('post_season','Post-Season — Decompress',          'concentric',       'mixed',                 96, 'daily',               2, 3, 3, 5, 2, 'Deload + tissue health. Light concentric primers, mixed mobility.')
ON CONFLICT (phase) DO NOTHING;

-- ---------- Seed canonical movement catalog ----------
INSERT INTO public.wk_movement_catalog
  (slug, name, category, pattern, variant, sport_scope, min_training_age_years, cns_cost, cue, why_prescribed, contraindications, regression_slug, progression_slug, default_sets, default_reps, default_tempo, default_load_pct)
VALUES
-- Compound lifts (double-ecc + concentric variants)
('back_squat_double_ecc',     'Back Squat — Double Eccentric', 'compound', 'squat',  'double_eccentric', 'both', 2, 3, 'Lower 5s, pause 1s, drive up 50% then lower again 3s, then drive to lockout.', 'Builds eccentric capacity + tendon resilience for landing/rotation. Foundation of OS Q1-Q2.', '{"knee_acute","low_back_acute"}', 'goblet_squat', 'back_squat_pause', 4, 3, '5-1-X-3', 70),
('back_squat_concentric',     'Back Squat — Concentric Primer','compound', 'squat',  'concentric',       'both', 1, 2, 'Quick controlled descent, drive up explosively. No pause, no extra eccentric.', 'In-season strength primer. Maintains output without inducing hypertrophy or DOMS.', '{"knee_acute","low_back_acute"}', 'goblet_squat', NULL, 3, 3, '2-0-X-0', 75),
('front_squat_double_ecc',    'Front Squat — Double Eccentric','compound', 'squat',  'double_eccentric', 'both', 3, 3, 'Elbows high, 4s down, drive up halfway, 3s down again, drive to top.', 'Loads quads & torso bracing without compressive spine load. Excellent for catchers + pitchers.', '{"shoulder_acute","wrist_acute"}', 'goblet_squat', NULL, 3, 3, '4-1-X-3', 65),
('trap_bar_dl_double_ecc',    'Trap Bar Deadlift — Double Eccentric','compound','hinge','double_eccentric','both',2,3,'Hinge with neutral spine. Lower under 5s, lift halfway, lower 3s, lift to lockout.','Hip hinge dominant pull — transfers to acceleration + jump capacity. Knee-friendly hinge.', '{"low_back_acute"}', 'rdl_db', 'barbell_dl_double_ecc', 4, 3, '5-1-X-3', 72),
('rdl_double_ecc',            'Romanian Deadlift — Double Eccentric','compound','hinge','double_eccentric','both',2,2,'Soft knees, push hips back, 5s down, 50% up, 3s down, drive to top.','Posterior chain eccentric loading — hamstring health for sprinting + base running.', '{"low_back_acute","hamstring_strain"}', 'rdl_db', 'snatch_grip_rdl', 4, 5, '5-1-X-3', 65),
('rdl_concentric',            'Romanian Deadlift — Concentric','compound','hinge','concentric','both',1,2,'Push hips back smoothly, drive hips through fast.','In-season hamstring primer. Maintains posterior chain without inducing soreness.', '{"low_back_acute"}', 'rdl_db', NULL, 3, 4, '2-0-X-0', 65),
('hip_thrust_double_ecc',     'Hip Thrust — Double Eccentric','compound','hinge','double_eccentric','both',1,2,'Drive hips up, lock glutes, lower 4s, drive halfway, lower 3s, drive to top.','Sprint-specific hip extension. Most direct strength→speed transfer compound.', '{"low_back_acute"}', 'glute_bridge', NULL, 3, 5, '4-1-X-3', 70),
('hip_thrust_concentric',     'Hip Thrust — Concentric Primer','compound','hinge','concentric','both',1,2,'Drive hips up explosively, brief hold, controlled return.','In-season sprint-power maintainer. Low DOMS, high transfer.', '{}', 'glute_bridge', NULL, 3, 5, '2-0-X-1', 70),
('bench_press_double_ecc',    'Bench Press — Double Eccentric','compound','push','double_eccentric','both',2,2,'Touch chest under 4s, press halfway, lower 3s, drive to lockout.','Upper-body eccentric loading for decel through swing/throw + shoulder durability.', '{"shoulder_acute","elbow_acute"}', 'db_bench', 'incline_bench_double_ecc', 4, 3, '4-1-X-3', 70),
('bench_press_concentric',    'Bench Press — Concentric','compound','push','concentric','both',1,2,'Lower controlled, press fast.','In-season upper-body strength primer.', '{"shoulder_acute"}', 'db_bench', NULL, 3, 3, '2-0-X-0', 72),
('incline_bench_double_ecc',  'Incline Bench — Double Eccentric','compound','push','double_eccentric','both',3,2,'Bar to upper chest under 4s, press halfway, lower 3s, drive to top.','Front-delt + upper pec eccentric for throwing decel.', '{"shoulder_acute"}', 'incline_db_press', NULL, 3, 4, '4-1-X-3', 65),
('weighted_pullup_double_ecc','Weighted Pull-up — Double Eccentric','compound','pull','double_eccentric','both',3,2,'Pull chin over bar, lower 5s, pull halfway, lower 3s, pull to top.','Eccentric lat & scap control — protects shoulder for throwers, builds rotational anchor.', '{"shoulder_acute","elbow_acute"}', 'lat_pulldown', NULL, 3, 3, '5-1-X-3', 0),
('weighted_pullup_concentric','Weighted Pull-up — Concentric','compound','pull','concentric','both',2,2,'Pull explosively chin over bar, controlled return.','In-season pulling primer.', '{}', 'lat_pulldown', NULL, 3, 3, '2-0-X-0', 0),
('push_press_concentric',     'Push Press — Concentric','compound','push','concentric','both',2,2,'Quick dip, explosive drive overhead.','Whole-body extension power primer. In-season friendly.', '{"shoulder_acute"}', 'db_strict_press', NULL, 3, 3, '0-0-X-0', 70),

-- KOT supplementals
('atg_split_squat',           'ATG Split Squat',              'kot', 'squat',   NULL, 'both', 0, 1, 'Front foot flat, drop hamstring to calf, drive up. Full ROM, no half reps.', 'Knee resilience + full-ROM strength. Bulletproofs the knee for sprinting and slides.', '{"knee_surgery_lt_6mo"}', 'reverse_lunge', 'rear_foot_elev_split_squat', 3, 8, '3-0-1-0', NULL),
('poliquin_step_up',          'Poliquin Step-Up',             'kot', 'squat',   NULL, 'both', 0, 1, 'Front foot fully on box, drive through heel + mid-foot, slow descent.', 'VMO development + single-leg control. Reduces knee valgus on first step.', '{"knee_acute"}', 'box_step_up', NULL, 3, 8, '2-0-2-0', NULL),
('reverse_nordic',            'Reverse Nordic',               'kot', 'mobility',NULL, 'both', 0, 1, 'Tall kneeling, lean back slow under control, return.', 'Quad eccentric + hip flexor lengthening. Prevents sprint hip flexor strains.', '{"knee_acute"}', 'quad_stretch', 'reverse_nordic_loaded', 3, 6, '4-0-1-0', NULL),
('tibialis_raise',            'Tibialis Raise',               'kot', 'mobility',NULL, 'both', 0, 0, 'Heels planted, lift toes, hold 2s, slow lower.', 'Anterior tib strength = ankle deceleration + shin splint prevention.', '{}', NULL, 'tibialis_raise_loaded', 3, 15, '2-2-1-0', NULL),
('sissy_squat',               'Sissy Squat',                  'kot', 'squat',   NULL, 'both', 1, 1, 'Heels elevated, knees forward, drop slow, rise slow.', 'Deep-knee quad strength. Builds tendon resilience often missed by squats.', '{"knee_acute"}', 'wall_sit', NULL, 3, 8, '3-0-2-0', NULL),
('full_rom_calf',             'Full-ROM Calf Raise',          'kot', 'mobility',NULL, 'both', 0, 0, 'On step, drop heel below, rise to full point, slow tempo.', 'Achilles + soleus capacity for sprinting & jumping.', '{}', NULL, 'single_leg_full_rom_calf', 3, 12, '2-1-1-0', NULL),
('fhl_peroneal',              'FHL / Peroneal Work',          'kot', 'mobility',NULL, 'both', 0, 0, 'Band around big toe / lateral foot, controlled flexion.', 'Foot intrinsic strength. Better cleat purchase + lateral stability.', '{}', NULL, NULL, 2, 12, '2-0-1-0', NULL),
('kot_sled_drag',             'KOT Backward Sled Drag',       'kot', 'sprint',  NULL, 'both', 0, 1, 'Backward walk pulling sled, drive through quads.', 'Pure concentric quad work — knee health w/o joint stress.', '{}', NULL, NULL, 3, 30, NULL, NULL),

-- Functional Patterning supplementals
('frc_cars_full_body',        'FRC CARs — Full Body',         'functional_patterning','mobility',NULL,'both',0,0,'Slow controlled articular rotations at every joint, max ROM, no compensation.','Joint capsular health, prep tissues for high-output work.', '{}', NULL, NULL, 1, 1, NULL, NULL),
('ninety_ninety_transition',  '90/90 Hip Transitions',        'functional_patterning','mobility',NULL,'both',0,0,'Sit 90/90, rotate slow through both hips, chest up, no hand support.','Hip rotation capacity for batting + pitching.', '{"hip_acute"}', NULL, NULL, 3, 5, NULL, NULL),
('fp_arm_line_spiral',        'FP Arm-Line Spiral',           'functional_patterning','rotational',NULL,'both',1,1,'Anchored band, spiral arm through full diagonal ROM, breathe at end-range.','Builds rotational arm chain integrity — protects throwing shoulder, supports bat path.', '{"shoulder_acute"}', NULL, NULL, 2, 8, NULL, NULL),
('fp_leg_line_spiral',        'FP Leg-Line Spiral',           'functional_patterning','rotational',NULL,'both',1,1,'Banded foot, spiral leg through diagonal pattern, brace torso.','Leg rotational chain — base running, lateral defensive moves.', '{}', NULL, NULL, 2, 8, NULL, NULL),
('contralateral_cross_crawl', 'Contralateral Cross-Crawl',    'functional_patterning','mobility',NULL,'both',0,0,'Opposite arm to opposite knee, smooth controlled tempo.','CNS coordination primer. Improves sprint coupling and pitching rhythm.', '{}', NULL, NULL, 2, 20, NULL, NULL),
('deep_squat_breathing',      'Deep-Squat Breathing',         'functional_patterning','mobility',NULL,'both',0,0,'Bottom of squat hold, 360° belly breathing, 5s in 5s out.','Pelvic floor + diaphragm reset. Prerequisite for hip rotation.', '{}', NULL, NULL, 1, 8, NULL, NULL),
('hanging_brachiation',       'Hanging Brachiation',          'functional_patterning','mobility',NULL,'both',1,1,'Hang from bar, swing controlled side to side, alternate hand release.','Shoulder decompression + scap strength. Critical for pitchers.', '{"shoulder_acute"}', NULL, NULL, 3, 30, NULL, NULL),

-- Bat-speed / rotational power
('overload_bat_swings',       'Overload Bat Swings',          'bat_speed','rotational','overload','both',1,2,'Heavier-than-game bat, ~6 swings, full intent.','Recruits high-threshold motor units → bat speed transfer.', '{"oblique_strain","elbow_acute"}', NULL, NULL, 3, 6, NULL, NULL),
('underload_bat_swings',      'Underload Bat Swings',         'bat_speed','rotational','underload','both',1,2,'Lighter-than-game bat, ~6 swings, max bat speed.','Overspeed for bat — primes peak velocity.', '{}', NULL, NULL, 3, 6, NULL, NULL),
('med_ball_shot_put',         'Med Ball Rotational Shot-Put', 'bat_speed','rotational',NULL,'both',0,2,'Athletic stance, rotate hips, fire ball into wall.','Hip-led rotational power output. Direct bat-speed driver.', '{"oblique_strain"}', NULL, NULL, 3, 5, NULL, NULL),
('med_ball_scoop_toss',       'Med Ball Scoop Toss',          'bat_speed','rotational',NULL,'both',0,1,'Quarter squat, scoop ball overhead/backward — full triple extension.','Posterior chain power, vertical force production.', '{}', NULL, NULL, 3, 5, NULL, NULL),
('band_resisted_swings',      'Band-Resisted Swings',         'bat_speed','rotational',NULL,'both',1,2,'Band around handle/waist, controlled high-intent swings.','Builds rotational deceleration capacity.', '{"oblique_strain"}', NULL, NULL, 3, 5, NULL, NULL),
('plyo_ball_pitching',        'Plyo-Ball Pitching Variants',  'bat_speed','rotational',NULL,'both',1,2,'Weighted plyo balls — pivot pickoff, rocker, reverse throws.','Arm care + velocity work. Eccentric arm capacity.', '{"shoulder_acute","elbow_acute"}', NULL, NULL, 3, 8, NULL, NULL),
('cable_chops',               'Cable Chops',                  'bat_speed','rotational',NULL,'both',1,1,'Cable from high anchor, rotate down and across, brace core.','Rotational core under load.', '{"oblique_strain"}', NULL, NULL, 3, 8, NULL, NULL),
('paloff_press',              'Paloff Press',                 'bat_speed','rotational',NULL,'both',0,1,'Anti-rotation hold, press out and back slowly.','Anti-rotation strength = rotational power foundation.', '{}', NULL, NULL, 3, 8, NULL, NULL),

-- Speed Lab
('accel_10_30y',              'Acceleration Sprints 10-30y',  'speed_lab','sprint',NULL,'both',0,2,'3-pt stance, drive low, push ground back, 4-5 strides accel.','First-step + acceleration capacity — base stealing, defensive jumps.', '{"hamstring_strain","quad_strain"}', NULL, NULL, 5, 1, NULL, NULL),
('max_velocity_flys',         'Max-Velocity Flys 20y',        'speed_lab','sprint',NULL,'both',1,3,'30y build-up into 20y full-speed fly zone.','Top-end speed development — extends sprint window for tagging up + tracking deep balls.', '{"hamstring_strain"}', NULL, NULL, 4, 1, NULL, NULL),
('resisted_sled',             'Resisted Sled Sprint (≤10% BW)','speed_lab','sprint',NULL,'both',0,2,'Sled load ≤10% BW, full sprint mechanics, 15-20y.','Horizontal force production. Improves acceleration without breaking mechanics.', '{"hamstring_strain"}', NULL, NULL, 4, 1, NULL, NULL),
('overspeed_assist',          'Overspeed Assisted Sprint',    'speed_lab','sprint',NULL,'both',2,3,'Downhill or band-assist — stride at speeds above current max.','Neural overspeed — raises max velocity ceiling. Advanced only.', '{"hamstring_strain","quad_strain"}', 'accel_10_30y', NULL, 4, 1, NULL, NULL),
('plyo_low_box',              'Plyometric Low-Box Landings',  'speed_lab','plyo',NULL,'both',0,1,'Step off 6-12in box, land soft, absorb. NO bouncing.','Landing mechanics + tendon prep. Gates depth jump progression.', '{"knee_acute","ankle_acute"}', NULL, 'plyo_depth_jump', 3, 5, NULL, NULL),
('plyo_depth_jump',           'Depth Jump',                   'speed_lab','plyo',NULL,'both',2,3,'Drop from 18-24in, immediate vertical jump on contact — minimize ground contact.','Reactive strength — pure plyometric. Gated to athletes with 4+ weeks clean low-box landings.', '{"knee_acute","ankle_acute","patellar_tendinitis"}', 'plyo_low_box', NULL, 4, 3, NULL, NULL),
('reactive_starts',           'Reactive Starts',              'speed_lab','sprint',NULL,'both',1,2,'On a visual or audio cue, fire into a 5-10y sprint.','Trains reaction window — defensive jumps + base steals.', '{}', NULL, NULL, 5, 1, NULL, NULL),
('lateral_first_step',        'Lateral First-Step (Baseball)','speed_lab','sprint',NULL,'baseball',0,2,'Defensive stance, fire on cue, 5-10y lateral burst.','Defensive range. Baseball default speed work.', '{}', NULL, NULL, 6, 1, NULL, NULL),
('repeat_90ft_bb',            'Repeat 90ft Sprints (Baseball)','speed_lab','sprint',NULL,'baseball',0,2,'90ft sprint, walk back, repeat. Models inning-restart capacity.', 'Inning-by-inning repeatability — the part of the season that hurts.', '{}', NULL, NULL, 9, 1, NULL, NULL),
('repeat_43ft_sb',            'Repeat 43ft Accel (Softball)', 'speed_lab','sprint',NULL,'softball',0,2,'43ft sprint, walk back, repeat. Softball base-distance specific.', 'Softball-distance repeatability for stealing + advancing.', '{}', NULL, NULL, 9, 1, NULL, NULL),
('slap_runner_crossover',     'Slap-Runner Crossover Starts (Softball)','speed_lab','sprint',NULL,'softball',1,2,'From slap stance, crossover step, accel to first.','Specific to lefty slappers — first-step out of the box.', '{}', NULL, NULL, 6, 1, NULL, NULL),

-- Conditioning (inning-restart + bases + position)
('inning_restart_sim_bb',     'Inning-Restart Sim — Baseball','conditioning','sprint',NULL,'baseball',0,2,'Sit 3-5 min, fire into 90ft sprint × 9 innings. Models the hardest part of the season.', 'Conditioning for what makes in-season hard — re-firing after sitting.', '{}', NULL, NULL, 9, 1, NULL, NULL),
('inning_restart_sim_sb',     'Inning-Restart Sim — Softball','conditioning','sprint',NULL,'softball',0,2,'Sit 3-5 min, fire into 60ft sprint × 7 innings.','Softball-specific inning-restart conditioning.', '{}', NULL, NULL, 7, 1, NULL, NULL),
('bases_1st_3rd',             '1st → 3rd Sprints',            'conditioning','sprint',NULL,'both',0,2,'Lead off 1st, full sprint to 3rd, walk back.','Real base-running repeatability.', '{}', NULL, NULL, 6, 1, NULL, NULL),
('bases_home_2nd',            'Home → 2nd Sprints',           'conditioning','sprint',NULL,'both',0,2,'Sprint home to 2nd, round 1st, walk back.','Models the double + extra-base hustle.', '{}', NULL, NULL, 6, 1, NULL, NULL),
('catcher_up_downs',          'Catcher Up-Downs',             'conditioning','plyo',NULL,'both',0,1,'Full catcher squat → stand → squat, controlled.','Catcher-specific knee + hip endurance.', '{"knee_acute"}', NULL, NULL, 3, 12, NULL, NULL),
('of_read_and_go',            'OF Read-and-Go',               'conditioning','sprint',NULL,'both',0,2,'On cue, drop step + sprint 30y. Read-react drill.', 'Outfielder first-step + tracking.', '{}', NULL, NULL, 6, 1, NULL, NULL),
('if_lateral_repeat',         'IF Lateral Repeatability',     'conditioning','sprint',NULL,'both',0,2,'5y lateral burst each direction, repeat.', 'Infielder range repeatability.', '{}', NULL, NULL, 8, 1, NULL, NULL),
('pitcher_field_and_cover',   'Pitcher Field-and-Cover',      'conditioning','sprint',NULL,'both',0,1,'PFP: field comebacker, cover 1st.', 'Pitcher specific conditioning.', '{}', NULL, NULL, 6, 1, NULL, NULL),
('mif_turn_and_fire',         'MIF Turn-and-Fire',            'conditioning','rotational',NULL,'both',0,1,'Field grounder, turn through bag, fire across body.','Middle-infield double-play repeatability.', '{}', NULL, NULL, 6, 1, NULL, NULL),

-- Cross-sport conditioning
('cross_sport_basketball',    'Cross-Sport: Basketball',      'cross_sport','aerobic',NULL,'both',0,1,'30-45 min controlled-intensity hoops. Reactive + lateral.','Frees CNS from baseball patterns while training same energy systems.', '{}', NULL, NULL, 1, 1, NULL, NULL),
('cross_sport_soccer',        'Cross-Sport: Soccer',          'cross_sport','aerobic',NULL,'both',0,1,'30-45 min controlled soccer. Constant change of direction.','Hip mobility + aerobic base.', '{}', NULL, NULL, 1, 1, NULL, NULL),
('cross_sport_swim',          'Cross-Sport: Swim',            'cross_sport','aerobic',NULL,'both',0,0,'20-30 min easy pool work. Active recovery.', 'Zero-impact recovery + shoulder mobility.', '{}', NULL, NULL, 1, 1, NULL, NULL),
('cross_sport_bike',          'Cross-Sport: Bike',            'cross_sport','aerobic',NULL,'both',0,0,'30 min Z2 ride. Recovery + aerobic base.','Aerobic recovery without joint cost.', '{}', NULL, NULL, 1, 1, NULL, NULL)
ON CONFLICT (slug) DO NOTHING;
