REVOKE SELECT, INSERT, UPDATE ON public.intelligence_recommendations FROM authenticated;
GRANT SELECT (id, user_id, area, do_this, followed, followed_at, outcome, checked_at, created_at) ON public.intelligence_recommendations TO authenticated;
GRANT UPDATE (followed, followed_at) ON public.intelligence_recommendations TO authenticated;
COMMENT ON COLUMN public.intelligence_recommendations.baseline_value IS 'Locked analysis score; server-only (scores are hidden from players).';
COMMENT ON COLUMN public.intelligence_recommendations.recheck_value IS 'Locked analysis score; server-only.';