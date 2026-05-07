ALTER TABLE public.performance_sessions
ADD COLUMN IF NOT EXISTS season_context_overridden boolean NOT NULL DEFAULT false;