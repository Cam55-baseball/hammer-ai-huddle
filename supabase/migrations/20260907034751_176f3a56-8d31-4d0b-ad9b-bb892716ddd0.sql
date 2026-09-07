CREATE TABLE public.wk_schedule_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_date date NOT NULL,
  kind text NOT NULL DEFAULT 'lift_anyway',
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, plan_date, kind)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.wk_schedule_overrides TO authenticated;
GRANT ALL ON public.wk_schedule_overrides TO service_role;

ALTER TABLE public.wk_schedule_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Athletes manage their own schedule overrides"
ON public.wk_schedule_overrides FOR ALL TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_wk_schedule_overrides_updated_at
BEFORE UPDATE ON public.wk_schedule_overrides
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_wk_schedule_overrides_user_date ON public.wk_schedule_overrides (user_id, plan_date);