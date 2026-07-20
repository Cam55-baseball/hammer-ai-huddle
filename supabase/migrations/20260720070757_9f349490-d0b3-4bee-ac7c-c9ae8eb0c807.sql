ALTER TABLE public.athlete_context
  ADD COLUMN IF NOT EXISTS sleep_target_hrs numeric,
  ADD COLUMN IF NOT EXISTS water_goal_oz numeric,
  ADD COLUMN IF NOT EXISTS diet_style text,
  ADD COLUMN IF NOT EXISTS allergies text,
  ADD COLUMN IF NOT EXISTS level_target text,
  ADD COLUMN IF NOT EXISTS focus_area text,
  ADD COLUMN IF NOT EXISTS pregame_routine text,
  ADD COLUMN IF NOT EXISTS coach_code text;