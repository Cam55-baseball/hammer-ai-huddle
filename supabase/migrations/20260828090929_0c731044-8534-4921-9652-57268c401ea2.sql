REVOKE ALL ON FUNCTION public.confirm_evaluation_attendance(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_pending_evaluations() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_athlete_evaluators(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.confirm_evaluation_attendance(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_pending_evaluations() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_athlete_evaluators(uuid) TO authenticated;