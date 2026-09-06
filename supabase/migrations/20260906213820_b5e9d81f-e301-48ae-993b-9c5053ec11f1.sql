ALTER TABLE public.wk_movement_catalog
  ADD COLUMN IF NOT EXISTS shoulder_end_range boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.wk_movement_catalog.shoulder_end_range IS
  'Shoulder driven to end range under load (deep dip bottom, loaded overhead lockout/catch, straight-arm overhead pullover). NOT shoulder work generally, and NOT eccentric control. Arm care is unaffected by design.';

UPDATE public.wk_movement_catalog
   SET shoulder_end_range = true
 WHERE slug IN (
   'full_range_dip',
   'ring_dip',
   'dumbbell_pullover_hold',
   'straight_arm_dumbbell_pullover',
   'lift_hang_power_snatch',
   'lift_db_snatch',
   'block_power_snatch',
   'lift_split_jerk',
   'lift_push_jerk'
 );

-- Remove the Stage 3 one-off season override on full_range_dip; the flag owns
-- this decision now.
UPDATE public.wk_movement_catalog
   SET season_legality = jsonb_set(coalesce(season_legality, '{}'::jsonb), '{in_season}', 'true'::jsonb)
 WHERE slug = 'full_range_dip';