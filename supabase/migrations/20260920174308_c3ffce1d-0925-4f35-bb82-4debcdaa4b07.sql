ALTER TABLE public.gp_games
  ADD COLUMN IF NOT EXISTS innings_played numeric,
  ADD COLUMN IF NOT EXISTS pitch_count integer;

COMMENT ON COLUMN public.gp_games.innings_played IS 'TCS S4 one-tap logging: innings the athlete played in this game.';
COMMENT ON COLUMN public.gp_games.pitch_count IS 'TCS S4 one-tap logging: pitches thrown by the athlete in this game.';