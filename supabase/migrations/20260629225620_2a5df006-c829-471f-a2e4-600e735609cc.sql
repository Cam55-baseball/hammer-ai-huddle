
ALTER TABLE public.gp_games
  ADD COLUMN IF NOT EXISTS game_type TEXT,
  ADD COLUMN IF NOT EXISTS scheduled_time TEXT,
  ADD COLUMN IF NOT EXISTS game_summary JSONB DEFAULT '{}'::jsonb;

ALTER TABLE public.gp_games DROP CONSTRAINT IF EXISTS gp_games_status_check;
ALTER TABLE public.gp_games
  ADD CONSTRAINT gp_games_status_check
  CHECK (status IN ('draft','scheduled','in_progress','final','canceled','rescheduled'));
