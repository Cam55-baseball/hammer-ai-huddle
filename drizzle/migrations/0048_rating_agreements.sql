CREATE TABLE public.rating_agreements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL,
  athlete_id uuid NOT NULL,
  sport text NOT NULL,
  position text,
  test_key text NOT NULL,
  metric_key text NOT NULL,
  grade numeric(5,1) NOT NULL,
  agree boolean NOT NULL,
  note text CHECK (note IS NULL OR length(note) <= 500),
  created_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.rating_agreements IS 'Plan 4 A: coach Agree/Disagree on a shown rating. Never changes the rating.';
GRANT SELECT, INSERT ON public.rating_agreements TO authenticated;
GRANT ALL ON public.rating_agreements TO service_role;
ALTER TABLE public.rating_agreements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff insert own agreement" ON public.rating_agreements FOR INSERT TO authenticated
  WITH CHECK (coach_id = auth.uid() AND (public.has_role(auth.uid(),'coach') OR public.has_role(auth.uid(),'owner') OR public.has_role(auth.uid(),'admin')));
CREATE POLICY "staff read own agreements" ON public.rating_agreements FOR SELECT TO authenticated
  USING (coach_id = auth.uid() OR public.has_role(auth.uid(),'owner'));