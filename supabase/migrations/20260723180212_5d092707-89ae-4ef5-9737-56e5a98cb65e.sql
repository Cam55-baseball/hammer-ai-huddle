
-- Catalog: precise dosage fields
ALTER TABLE public.wk_movement_catalog
  ADD COLUMN IF NOT EXISTS default_duration_seconds integer,
  ADD COLUMN IF NOT EXISTS default_distance_feet integer,
  ADD COLUMN IF NOT EXISTS default_total_reps integer,
  ADD COLUMN IF NOT EXISTS dosage_unit text;

-- Published prescription rows carry the exact dosage the athlete should execute.
ALTER TABLE public.wk_prescriptions
  ADD COLUMN IF NOT EXISTS duration_seconds integer,
  ADD COLUMN IF NOT EXISTS distance_feet integer,
  ADD COLUMN IF NOT EXISTS total_reps integer,
  ADD COLUMN IF NOT EXISTS dosage_unit text;

-- Session logs can record what the athlete actually completed.
ALTER TABLE public.wk_session_logs
  ADD COLUMN IF NOT EXISTS duration_seconds_completed integer,
  ADD COLUMN IF NOT EXISTS distance_feet_completed integer,
  ADD COLUMN IF NOT EXISTS total_reps_completed integer;
