ALTER TABLE public.videos
  ADD COLUMN IF NOT EXISTS practice_session_id uuid NULL REFERENCES public.performance_sessions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS game_id uuid NULL REFERENCES public.games(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_videos_practice_session_id ON public.videos(practice_session_id) WHERE practice_session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_videos_game_id ON public.videos(game_id) WHERE game_id IS NOT NULL;

ALTER TABLE public.performance_sessions
  ADD COLUMN IF NOT EXISTS legacy_in_players_club boolean NOT NULL DEFAULT false;

ALTER TABLE public.games
  ADD COLUMN IF NOT EXISTS legacy_in_players_club boolean NOT NULL DEFAULT false;

-- Backfill while bypassing edit-window triggers (legacy flag is metadata, not user-edited content)
ALTER TABLE public.performance_sessions DISABLE TRIGGER USER;
UPDATE public.performance_sessions SET legacy_in_players_club = true WHERE legacy_in_players_club = false;
ALTER TABLE public.performance_sessions ENABLE TRIGGER USER;

ALTER TABLE public.games DISABLE TRIGGER USER;
UPDATE public.games SET legacy_in_players_club = true WHERE legacy_in_players_club = false;
ALTER TABLE public.games ENABLE TRIGGER USER;

CREATE INDEX IF NOT EXISTS idx_performance_sessions_legacy_club ON public.performance_sessions(user_id) WHERE legacy_in_players_club = true;
CREATE INDEX IF NOT EXISTS idx_games_legacy_club ON public.games(user_id) WHERE legacy_in_players_club = true;