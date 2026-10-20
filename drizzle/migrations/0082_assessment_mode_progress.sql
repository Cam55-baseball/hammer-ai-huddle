ALTER TABLE public.initial_assessments ADD COLUMN IF NOT EXISTS step_progress jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.initial_assessments ADD COLUMN IF NOT EXISTS current_step integer NOT NULL DEFAULT 1;
ALTER TABLE public.initial_assessments ADD COLUMN IF NOT EXISTS mode_opened_at timestamptz;
ALTER TABLE public.initial_assessments ADD COLUMN IF NOT EXISTS last_season_stats jsonb;
COMMENT ON COLUMN public.initial_assessments.step_progress IS 'Assessment navigation status only: done or skipped. Never fabricated test results.';
COMMENT ON COLUMN public.initial_assessments.mode_opened_at IS 'Once-per-account Assessment Mode presentation after confirmed player payment.';