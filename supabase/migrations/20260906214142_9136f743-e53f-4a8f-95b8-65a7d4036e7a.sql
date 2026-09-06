ALTER TABLE public.calendar_events
  ADD COLUMN IF NOT EXISTS is_starting_pitcher boolean NOT NULL DEFAULT false;

ALTER TABLE public.gp_games
  ADD COLUMN IF NOT EXISTS is_starting_pitcher boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.calendar_events.is_starting_pitcher IS
  'Athlete marked themselves the starting pitcher for this game. Removes the lift for the day.';
COMMENT ON COLUMN public.gp_games.is_starting_pitcher IS
  'Athlete marked themselves the starting pitcher for this game. Removes the lift for the day.';