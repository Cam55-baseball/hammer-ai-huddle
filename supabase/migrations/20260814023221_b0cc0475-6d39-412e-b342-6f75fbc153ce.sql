-- 1) One shared family for every ATG deep-knee-flexion variant so season gates
--    can never be bypassed by a renamed duplicate slug.
UPDATE public.wk_movement_catalog
SET substitution_family = 'atg_split_squat',
    updated_at = now()
WHERE slug IN (
  'atg_split_squat',
  'lift_atg_split_squat',
  'kot_atg_split_squat',
  'sp_atg_split_squat',
  'lift_atg_lunge'
);

-- 2) Full-ROM development versions: off-season only, eccentric-dominant.
UPDATE public.wk_movement_catalog
SET is_eccentric_dominant = true,
    phase_allow = ARRAY['os_q1','os_q2','os_q3','os_q4'],
    season_eligibility = ARRAY['os_q1','os_q2','os_q3','os_q4'],
    dosage_unit = 'reps',
    updated_at = now()
WHERE slug IN ('atg_split_squat', 'lift_atg_split_squat', 'lift_atg_lunge');

-- 3) The single legal in-season version: ROM-limited maintenance dose.
UPDATE public.wk_movement_catalog
SET name = 'ATG Split Squat — ROM-limited maintenance',
    category = 'kot',
    default_sets = 2,
    default_reps = 5,
    dosage_unit = 'reps',
    is_eccentric_dominant = false,
    cns_cost = 1,
    phase_allow = ARRAY['os_q1','os_q2','os_q3','os_q4','pre_season','in_season','post_season'],
    season_eligibility = ARRAY['os_q1','os_q2','os_q3','os_q4','in_season','post_season'],
    cue = 'Front shin travels forward only to a pain-free range — stop well short of your deepest sit. Controlled down, no bounce, no near-failure reps.',
    why_prescribed = 'In-season knee and hip durability maintenance, not a development block. Reduced range and low volume keep the tendon healthy without stealing freshness from games.',
    updated_at = now()
WHERE slug = 'kot_atg_split_squat';

-- 4) Repair the corrupted speed-lab entry and move it out of the running
--    warm-up domain entirely.
UPDATE public.wk_movement_catalog
SET name = 'ATG Split Squat — knee resilience (strength block)',
    category = 'kot',
    dosage_unit = 'reps',
    default_sets = 2,
    default_reps = 5,
    default_distance_feet = NULL,
    sprint_compatible = false,
    game_day_eligible = false,
    phase_allow = ARRAY['os_q1','os_q2','os_q3','os_q4','pre_season'],
    season_eligibility = ARRAY['os_q1','os_q2','os_q3','os_q4'],
    cue = 'Strength-block movement. Never performed before sprinting or running — deep loaded knee flexion blunts tendon stiffness for speed work.',
    why_prescribed = 'Knee-over-toe resilience work. Belongs in a strength block after any running, never as a warm-up.',
    updated_at = now()
WHERE slug = 'sp_atg_split_squat';