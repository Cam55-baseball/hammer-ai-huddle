CREATE OR REPLACE FUNCTION public.is_my_account_under_13()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT auth.uid() IS NOT NULL AND public.is_under_13(auth.uid()); $$;
REVOKE ALL ON FUNCTION public.is_my_account_under_13() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_my_account_under_13() TO authenticated, service_role;
GRANT SELECT (id, user_id, area, do_this, followed, followed_at, outcome, checked_at, created_at, principle_version_id) ON public.intelligence_recommendations TO authenticated;
GRANT UPDATE (followed, followed_at) ON public.intelligence_recommendations TO authenticated;
COMMENT ON FUNCTION public.is_my_account_under_13() IS 'Self-only consent age classification; exposes neither birth date nor another account age.';