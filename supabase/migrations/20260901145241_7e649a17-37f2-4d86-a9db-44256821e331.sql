ALTER TABLE public.game_plan_user_preferences
  ADD COLUMN IF NOT EXISTS plan_in_use_athlete boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS plan_in_use_staff boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.game_plan_user_preferences.plan_in_use_athlete IS 'Athlete answer to "Game plan in use?" — false means the game plan card starts collapsed.';
COMMENT ON COLUMN public.game_plan_user_preferences.plan_in_use_staff IS 'Scout/coach answer to "Game plan in use?" — false means the staff game plan card starts collapsed.';