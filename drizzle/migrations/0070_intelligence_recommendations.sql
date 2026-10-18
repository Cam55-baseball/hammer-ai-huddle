CREATE TABLE public.intelligence_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  area text NOT NULL,
  do_this text NOT NULL,
  baseline_value numeric,
  followed boolean,
  followed_at timestamptz,
  recheck_value numeric,
  outcome text CHECK (outcome IN ('worked','no_change','got_worse')),
  checked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.intelligence_recommendations TO authenticated;
GRANT ALL ON public.intelligence_recommendations TO service_role;
ALTER TABLE public.intelligence_recommendations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own recs read" ON public.intelligence_recommendations FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "own recs insert" ON public.intelligence_recommendations FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "own recs update" ON public.intelligence_recommendations FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE INDEX ON public.intelligence_recommendations (user_id, created_at DESC);