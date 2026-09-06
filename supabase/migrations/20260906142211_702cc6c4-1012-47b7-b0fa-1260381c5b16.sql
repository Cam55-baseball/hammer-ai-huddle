ALTER TABLE public.wk_movement_catalog
  ADD COLUMN IF NOT EXISTS deep_flexion boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS eccentric_overload boolean NOT NULL DEFAULT false;

UPDATE public.wk_movement_catalog SET deep_flexion = true WHERE slug IN (
  'atg_split_squat','kot_atg_split_squat','lift_atg_split_squat','sp_atg_split_squat',
  'lift_atg_lunge','kot_lunge','sissy_squat','lift_kot_sissy_squat','lift_patrick_step',
  'lift_poliquin_stepup','poliquin_step_up','kot_slantboard_squat','slide_lunge'
);

UPDATE public.wk_movement_catalog SET eccentric_overload = true WHERE slug IN (
  'back_squat_double_ecc','bench_press_double_ecc','front_squat_double_ecc','hip_thrust_double_ecc',
  'incline_bench_double_ecc','rdl_double_ecc','trap_bar_dl_double_ecc','weighted_pullup_double_ecc',
  'copenhagen_adduction_ecc','lift_copenhagen_plank','sp_copenhagen_plank','wu_copenhagen_short_lever',
  'kot_nordic_hamstring','lift_nordic_curl_ecc','nordic_curl','sp_nordic_hamstring',
  'kot_reverse_nordic','lift_reverse_nordic','reverse_nordic',
  'lift_box_jump_depth_drop','lift_depth_drop_pushup','plyo_depth_jump',
  'sp_altitude_drop','wu_altitude_drop','lift_drop_jump_rebound_assisted'
);

INSERT INTO public.app_settings (setting_key, setting_value)
VALUES ('lifting_v2_enabled', 'false'::jsonb)
ON CONFLICT (setting_key) DO NOTHING;