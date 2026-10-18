CREATE OR REPLACE FUNCTION public.start_hammers_today()
RETURNS timestamptz LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v timestamptz;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not signed in'; END IF;
 SELECT hammers_today_started_at INTO v FROM public.profiles WHERE id = auth.uid();
 IF NOT FOUND THEN RAISE EXCEPTION 'account not found'; END IF;
 IF v IS NOT NULL THEN RETURN v; END IF;
 IF NOT EXISTS (SELECT 1 FROM public.initial_assessments WHERE user_id = auth.uid() AND completed_at IS NOT NULL) THEN
  RAISE EXCEPTION 'Tap Completed on your initial assessment first.';
 END IF;
 UPDATE public.profiles SET hammers_today_started_at = now() WHERE id = auth.uid() AND hammers_today_started_at IS NULL;
 SELECT hammers_today_started_at INTO v FROM public.profiles WHERE id = auth.uid();
 RETURN v;
END $$;
REVOKE ALL ON FUNCTION public.start_hammers_today() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.start_hammers_today() TO authenticated;