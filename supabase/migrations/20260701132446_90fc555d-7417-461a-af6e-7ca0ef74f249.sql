
-- Workout Intelligence Constitution (WIC) — schema extensions
-- Adds required exercise metadata for constitutional prescription and
-- adaptation/validator/generator_version fields on prescriptions.

ALTER TABLE public.wk_movement_catalog
  ADD COLUMN IF NOT EXISTS movement_pattern text,
  ADD COLUMN IF NOT EXISTS primary_adaptation text,
  ADD COLUMN IF NOT EXISTS secondary_adaptation text,
  ADD COLUMN IF NOT EXISTS season_eligibility text[] DEFAULT ARRAY['os_q1','os_q2','os_q3','os_q4','in_season','post_season']::text[],
  ADD COLUMN IF NOT EXISTS min_age_years integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS equipment text[] DEFAULT ARRAY[]::text[],
  ADD COLUMN IF NOT EXISTS joint_stress integer DEFAULT 3,
  ADD COLUMN IF NOT EXISTS recovery_cost integer DEFAULT 3,
  ADD COLUMN IF NOT EXISTS volume_cost integer DEFAULT 3,
  ADD COLUMN IF NOT EXISTS bias text CHECK (bias IN ('concentric','eccentric','isometric','mixed')) DEFAULT 'mixed',
  ADD COLUMN IF NOT EXISTS power_emphasis boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS speed_emphasis boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS elastic_emphasis boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS throw_compatible boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS bat_compatible boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS sprint_compatible boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS duplicate_group text,
  ADD COLUMN IF NOT EXISTS replacement_pool text[] DEFAULT ARRAY[]::text[],
  ADD COLUMN IF NOT EXISTS game_day_eligible boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS recovery_window_hours integer DEFAULT 48,
  ADD COLUMN IF NOT EXISTS wic_metadata_complete boolean DEFAULT false;

ALTER TABLE public.wk_prescriptions
  ADD COLUMN IF NOT EXISTS adaptation text,
  ADD COLUMN IF NOT EXISTS engine text,
  ADD COLUMN IF NOT EXISTS why_v2 jsonb,
  ADD COLUMN IF NOT EXISTS validator_report jsonb,
  ADD COLUMN IF NOT EXISTS generator_version text;

CREATE INDEX IF NOT EXISTS wk_movement_catalog_primary_adaptation_idx
  ON public.wk_movement_catalog (primary_adaptation);
CREATE INDEX IF NOT EXISTS wk_movement_catalog_wic_ready_idx
  ON public.wk_movement_catalog (wic_metadata_complete);
CREATE INDEX IF NOT EXISTS wk_prescriptions_generator_version_idx
  ON public.wk_prescriptions (generator_version);
