CREATE TABLE public.coach_hammer_steps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  plan_date DATE NOT NULL,
  snapshot_hash TEXT NOT NULL,
  step JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, plan_date, snapshot_hash)
);

CREATE INDEX idx_coach_hammer_steps_user_date ON public.coach_hammer_steps (user_id, plan_date, created_at DESC);

GRANT SELECT ON public.coach_hammer_steps TO authenticated;
GRANT ALL ON public.coach_hammer_steps TO service_role;

ALTER TABLE public.coach_hammer_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own coach hammer steps"
ON public.coach_hammer_steps FOR SELECT TO authenticated
USING (auth.uid() = user_id);