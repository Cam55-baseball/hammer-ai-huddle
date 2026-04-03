
-- 1. Create weakness_scores table for skill-specific effectiveness tracking
CREATE TABLE public.weakness_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  weakness_metric TEXT NOT NULL,
  score NUMERIC NOT NULL,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.weakness_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own weakness scores" ON public.weakness_scores FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service can manage weakness scores" ON public.weakness_scores FOR ALL USING (true);
CREATE INDEX idx_weakness_scores_user_metric ON public.weakness_scores(user_id, weakness_metric, computed_at DESC);

-- 2. Add weakness_metric column to drill_prescriptions
ALTER TABLE public.drill_prescriptions ADD COLUMN IF NOT EXISTS weakness_metric TEXT;
ALTER TABLE public.drill_prescriptions ADD COLUMN IF NOT EXISTS pre_weakness_value NUMERIC;
ALTER TABLE public.drill_prescriptions ADD COLUMN IF NOT EXISTS post_weakness_value NUMERIC;

-- 3. Add primary_batting_side fetch support (already exists in athlete_mpi_settings)
-- No schema change needed, just ensuring we query it in the edge function
