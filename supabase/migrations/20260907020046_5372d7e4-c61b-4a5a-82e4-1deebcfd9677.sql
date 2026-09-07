ALTER TABLE public.gp_games
  ADD COLUMN IF NOT EXISTS is_doubleheader boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ignored_for_training boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

ALTER TABLE public.calendar_events
  ADD COLUMN IF NOT EXISTS is_doubleheader boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ignored_for_training boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

ALTER TABLE public.athlete_mpi_settings
  ADD COLUMN IF NOT EXISTS season_status_manual boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS season_status_manual_at timestamptz;

CREATE INDEX IF NOT EXISTS gp_games_user_date_live_idx
  ON public.gp_games (user_id, game_date)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS calendar_events_user_date_live_idx
  ON public.calendar_events (user_id, event_date)
  WHERE deleted_at IS NULL;