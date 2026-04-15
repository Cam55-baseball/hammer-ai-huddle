CREATE TABLE public.session_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.performance_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  report jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(session_id)
);

ALTER TABLE public.session_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own insights"
  ON public.session_insights FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own insights"
  ON public.session_insights FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_session_insights_user ON public.session_insights(user_id);
CREATE INDEX idx_session_insights_session ON public.session_insights(session_id);