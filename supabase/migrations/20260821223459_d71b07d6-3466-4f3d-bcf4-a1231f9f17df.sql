CREATE TABLE public.wk_standard_awards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  standard_id TEXT NOT NULL,
  family TEXT NOT NULL,
  tier TEXT NOT NULL CHECK (tier IN ('standard','elite','world_class')),
  value_achieved NUMERIC,
  target_value NUMERIC,
  unit TEXT,
  movement_slug TEXT,
  bodyweight_lbs NUMERIC,
  plan_date DATE,
  evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
  verification TEXT NOT NULL DEFAULT 'self_logged',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, standard_id, tier)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.wk_standard_awards TO authenticated;
GRANT ALL ON public.wk_standard_awards TO service_role;

ALTER TABLE public.wk_standard_awards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Athletes manage their own standard awards"
  ON public.wk_standard_awards FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Linked coaches can view athlete standard awards"
  ON public.wk_standard_awards FOR SELECT TO authenticated
  USING (public.is_coach_of(auth.uid(), user_id));

CREATE INDEX idx_wk_standard_awards_user ON public.wk_standard_awards (user_id, created_at DESC);