
CREATE TABLE public.baserunning_daily_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  scenario_id UUID NOT NULL REFERENCES public.baserunning_scenarios(id) ON DELETE CASCADE,
  correct BOOLEAN NOT NULL,
  response_time_ms INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.baserunning_daily_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own daily attempts"
  ON public.baserunning_daily_attempts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own daily attempts"
  ON public.baserunning_daily_attempts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_daily_attempts_user_created
  ON public.baserunning_daily_attempts (user_id, created_at DESC);
