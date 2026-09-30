CREATE TABLE public.athlete_metric_observations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  video_id uuid,
  source text NOT NULL,            -- e.g. 'softball_pitching_card', 'delaycam', 'workload'
  metric_key text NOT NULL,        -- e.g. 'sp.sfc_separation.separation_at_sfc_deg'
  value double precision NOT NULL,
  engine_version text NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, video_id, metric_key, engine_version)
);
CREATE INDEX athlete_metric_observations_user_metric_idx ON public.athlete_metric_observations (user_id, metric_key, recorded_at);
GRANT SELECT, INSERT ON public.athlete_metric_observations TO authenticated;
GRANT ALL ON public.athlete_metric_observations TO service_role;
ALTER TABLE public.athlete_metric_observations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Athletes read own observations" ON public.athlete_metric_observations FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Linked coaches read athlete observations" ON public.athlete_metric_observations FOR SELECT TO authenticated USING (public.is_coach_of(auth.uid(), user_id));
CREATE POLICY "Owners read all observations" ON public.athlete_metric_observations FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'owner'::app_role));
CREATE POLICY "Athletes insert own observations" ON public.athlete_metric_observations FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);