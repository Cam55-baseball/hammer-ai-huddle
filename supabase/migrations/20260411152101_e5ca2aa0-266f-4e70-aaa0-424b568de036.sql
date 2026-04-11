ALTER TABLE public.baserunning_scenarios
  ADD COLUMN wrong_explanations jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN game_consequence text;