ALTER TABLE public.wk_movement_catalog
  ADD COLUMN IF NOT EXISTS coach_cue text,
  ADD COLUMN IF NOT EXISTS surface_hint text;