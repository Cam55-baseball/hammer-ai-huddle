
ALTER TABLE public.baserunning_scenarios DROP CONSTRAINT chk_scenarios_difficulty;
ALTER TABLE public.baserunning_scenarios ADD CONSTRAINT chk_scenarios_difficulty CHECK (difficulty = ANY (ARRAY['easy'::text, 'game_speed'::text, 'elite'::text, 'mistake'::text]));
