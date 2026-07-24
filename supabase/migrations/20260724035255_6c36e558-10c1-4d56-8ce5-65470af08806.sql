CREATE TABLE public.hammer_daily_task_completions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  plan_date date NOT NULL,
  task_id text NOT NULL,
  source text NOT NULL,
  source_ref text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  completed boolean NOT NULL DEFAULT true,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, plan_date, task_id)
);
CREATE INDEX idx_hdtc_user_date ON public.hammer_daily_task_completions(user_id, plan_date);
CREATE INDEX idx_hdtc_source_ref ON public.hammer_daily_task_completions(user_id, plan_date, source_ref);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.hammer_daily_task_completions TO authenticated;
GRANT ALL ON public.hammer_daily_task_completions TO service_role;

ALTER TABLE public.hammer_daily_task_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own tasks select" ON public.hammer_daily_task_completions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own tasks insert" ON public.hammer_daily_task_completions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own tasks update" ON public.hammer_daily_task_completions
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own tasks delete" ON public.hammer_daily_task_completions
  FOR DELETE USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.hdtc_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER hdtc_updated_at BEFORE UPDATE ON public.hammer_daily_task_completions
FOR EACH ROW EXECUTE FUNCTION public.hdtc_touch_updated_at();