ALTER TABLE public.athlete_context
  ADD COLUMN IF NOT EXISTS competition_age_group text,
  ADD COLUMN IF NOT EXISTS competition_home_state text,
  ADD COLUMN IF NOT EXISTS competition_play_state text,
  ADD COLUMN IF NOT EXISTS competition_events jsonb DEFAULT '[]'::jsonb;