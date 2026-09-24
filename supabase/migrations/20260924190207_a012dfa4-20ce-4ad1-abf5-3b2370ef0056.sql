CREATE TABLE public.adaptive_phase_credit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  discipline text NOT NULL,
  phase text NOT NULL,
  week_start date NOT NULL,
  sessions_done integer NOT NULL DEFAULT 0,
  sessions_prescribed integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, discipline, phase, week_start)
);
GRANT SELECT ON public.adaptive_phase_credit TO authenticated;
GRANT ALL ON public.adaptive_phase_credit TO service_role;
ALTER TABLE public.adaptive_phase_credit ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own credit read" ON public.adaptive_phase_credit FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "staff credit read" ON public.adaptive_phase_credit FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'owner'::app_role) OR public.has_role(auth.uid(),'admin'::app_role));

CREATE TABLE public.adaptive_phase_shadow (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  plan_date date NOT NULL,
  trigger text NOT NULL DEFAULT 'daily',
  engine_version text NOT NULL,
  window_weeks integer,
  hard_date date,
  plan jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, plan_date)
);
GRANT SELECT ON public.adaptive_phase_shadow TO authenticated;
GRANT ALL ON public.adaptive_phase_shadow TO service_role;
ALTER TABLE public.adaptive_phase_shadow ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own shadow read" ON public.adaptive_phase_shadow FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "staff shadow read" ON public.adaptive_phase_shadow FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'owner'::app_role) OR public.has_role(auth.uid(),'admin'::app_role));

INSERT INTO public.wk_feature_switches (feature_key, label, mode, allowlist, buildable, sort_order)
VALUES ('adaptive_phases', 'Adaptive phases', 'off', '{}', true, 110)
ON CONFLICT (feature_key) DO NOTHING;