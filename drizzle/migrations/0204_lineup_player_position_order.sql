ALTER TABLE public.coach_lineup_players ADD COLUMN IF NOT EXISTS position text;
ALTER TABLE public.coach_lineup_players ADD COLUMN IF NOT EXISTS batting_order integer;
COMMENT ON COLUMN public.coach_lineup_players.position IS 'Default position for this player in the saved lineup (editable each game).';
COMMENT ON COLUMN public.coach_lineup_players.batting_order IS 'Default batting-order spot (1-12) in the saved lineup.';