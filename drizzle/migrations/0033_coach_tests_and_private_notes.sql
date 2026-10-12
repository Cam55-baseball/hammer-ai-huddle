CREATE OR REPLACE FUNCTION public.coach_athlete_tests(_athlete uuid)
RETURNS TABLE(id uuid, test_date date, test_type text, sport text, results jsonb)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT (auth.uid() = _athlete OR public.is_coach_of(auth.uid(), _athlete) OR public.is_linked_coach(auth.uid(), _athlete)) THEN
    RAISE EXCEPTION 'not_allowed' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY SELECT t.id, t.test_date::date, t.test_type, t.sport, t.results FROM vault_performance_tests t
    WHERE t.user_id = _athlete ORDER BY t.test_date DESC, t.created_at DESC LIMIT 20;
END $$;
REVOKE ALL ON FUNCTION public.coach_athlete_tests(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.coach_athlete_tests(uuid) TO authenticated;

CREATE TABLE public.coach_private_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL DEFAULT auth.uid(),
  athlete_id uuid NOT NULL,
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX coach_private_notes_idx ON public.coach_private_notes (coach_id, athlete_id, created_at DESC);
GRANT SELECT, INSERT, DELETE ON public.coach_private_notes TO authenticated;
GRANT ALL ON public.coach_private_notes TO service_role;
ALTER TABLE public.coach_private_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "author reads own notes" ON public.coach_private_notes FOR SELECT TO authenticated USING (coach_id = auth.uid());
CREATE POLICY "connected coach writes notes" ON public.coach_private_notes FOR INSERT TO authenticated
  WITH CHECK (coach_id = auth.uid() AND (public.is_coach_of(auth.uid(), athlete_id) OR public.is_linked_coach(auth.uid(), athlete_id)));
CREATE POLICY "author deletes own notes" ON public.coach_private_notes FOR DELETE TO authenticated USING (coach_id = auth.uid());