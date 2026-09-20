ALTER TABLE public.gp_games ADD COLUMN IF NOT EXISTS innings_caught integer;
COMMENT ON COLUMN public.gp_games.innings_caught IS 'Optional. Innings spent catching in this game. Feeds the TCS catcher cost later.';
ALTER TABLE public.gp_games ADD CONSTRAINT gp_games_innings_caught_range CHECK (innings_caught IS NULL OR (innings_caught >= 0 AND innings_caught <= 30));