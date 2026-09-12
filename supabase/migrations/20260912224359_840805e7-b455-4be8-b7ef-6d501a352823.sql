ALTER TABLE public.game_plan_user_preferences
  ADD COLUMN IF NOT EXISTS plan_open_athlete boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS plan_open_staff boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.game_plan_user_preferences.plan_open_athlete IS 'Athlete hide/show choice for the game plan card — false means collapsed.';
COMMENT ON COLUMN public.game_plan_user_preferences.plan_open_staff IS 'Scout/coach hide/show choice for the staff game plan card — false means collapsed.';