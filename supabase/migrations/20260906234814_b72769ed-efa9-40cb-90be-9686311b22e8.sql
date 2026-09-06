CREATE TABLE public.wk_standard_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  standard_id TEXT NOT NULL,
  family TEXT NOT NULL,
  movement_slug TEXT NOT NULL,
  metric TEXT NOT NULL,
  unit TEXT,
  observed_value NUMERIC NOT NULL,
  reps_at_value INTEGER,
  bodyweight_lbs NUMERIC,
  training_age_band TEXT NOT NULL,
  chronological_age INTEGER,
  sample_size INTEGER NOT NULL DEFAULT 1 CHECK (sample_size >= 1),
  plan_date DATE NOT NULL,
  source TEXT NOT NULL DEFAULT 'self_logged',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, standard_id, movement_slug, plan_date, observed_value)
);

GRANT SELECT, INSERT ON public.wk_standard_attempts TO authenticated;
GRANT ALL ON public.wk_standard_attempts TO service_role;

ALTER TABLE public.wk_standard_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Athletes record their own standard attempts"
  ON public.wk_standard_attempts FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Athletes read their own standard attempts"
  ON public.wk_standard_attempts FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Linked coaches can view athlete standard attempts"
  ON public.wk_standard_attempts FOR SELECT TO authenticated
  USING (public.is_coach_of(auth.uid(), user_id));

CREATE INDEX idx_wk_standard_attempts_standard ON public.wk_standard_attempts (standard_id, training_age_band, plan_date DESC);
CREATE INDEX idx_wk_standard_attempts_user ON public.wk_standard_attempts (user_id, created_at DESC);