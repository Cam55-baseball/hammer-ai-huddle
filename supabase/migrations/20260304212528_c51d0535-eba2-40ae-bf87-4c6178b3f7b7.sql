ALTER TABLE public.scheduled_practice_sessions
  ADD COLUMN IF NOT EXISTS opponent_name text,
  ADD COLUMN IF NOT EXISTS opponent_level text,
  ADD COLUMN IF NOT EXISTS team_name text;