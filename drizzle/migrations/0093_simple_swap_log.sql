CREATE TABLE public.swap_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  plan_date date NOT NULL,
  prescription_id uuid NOT NULL,
  from_slug text NOT NULL,
  to_slug text NOT NULL,
  reason text NOT NULL,
  missing_items text[] NOT NULL DEFAULT '{}',
  scope text NOT NULL CHECK (scope IN ('today','always')),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.swap_log TO authenticated;
GRANT ALL ON public.swap_log TO service_role;
ALTER TABLE public.swap_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Players read own swaps" ON public.swap_log FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE INDEX swap_log_user_date ON public.swap_log(user_id, plan_date);