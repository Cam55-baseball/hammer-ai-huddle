CREATE TABLE public.wk_schedule_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  decision_date date NOT NULL,
  version text NOT NULL,
  config_hash text NOT NULL,
  thresholds_hash text NOT NULL,
  inputs_hash text NOT NULL,
  inputs_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  tank_levels jsonb NOT NULL DEFAULT '{}'::jsonb,
  allowed_class text NOT NULL,
  timing text NOT NULL,
  next_heavy_date date,
  reasons jsonb NOT NULL DEFAULT '[]'::jsonb,
  floors_applied jsonb NOT NULL DEFAULT '[]'::jsonb,
  diagnostics jsonb NOT NULL DEFAULT '[]'::jsonb,
  fallback_used boolean NOT NULL DEFAULT false,
  source text NOT NULL DEFAULT 'nightly',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT wk_schedule_decisions_unique UNIQUE (user_id, decision_date, version)
);
CREATE INDEX wk_schedule_decisions_date_idx ON public.wk_schedule_decisions (decision_date);

GRANT SELECT ON public.wk_schedule_decisions TO authenticated;
GRANT ALL ON public.wk_schedule_decisions TO service_role;
ALTER TABLE public.wk_schedule_decisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Athletes read their own schedule decisions"
  ON public.wk_schedule_decisions FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.tcs_shadow_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_at timestamptz NOT NULL DEFAULT now(),
  checked_date date NOT NULL,
  athletes integer NOT NULL DEFAULT 0,
  decisions integer NOT NULL DEFAULT 0,
  mismatches integer NOT NULL DEFAULT 0,
  fallbacks integer NOT NULL DEFAULT 0,
  fallback_rate numeric NOT NULL DEFAULT 0,
  first_mismatches jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'running',
  duration_seconds numeric
);
GRANT SELECT ON public.tcs_shadow_checks TO authenticated;
GRANT ALL ON public.tcs_shadow_checks TO service_role;
ALTER TABLE public.tcs_shadow_checks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read shadow checks"
  ON public.tcs_shadow_checks FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.wk_shadow_weekly_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  week_start date NOT NULL,
  week_end date NOT NULL,
  agreements integer NOT NULL DEFAULT 0,
  disagreements integer NOT NULL DEFAULT 0,
  detail jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT wk_shadow_weekly_reports_unique UNIQUE (user_id, week_start)
);
GRANT SELECT ON public.wk_shadow_weekly_reports TO authenticated;
GRANT ALL ON public.wk_shadow_weekly_reports TO service_role;
ALTER TABLE public.wk_shadow_weekly_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Athletes read their own shadow report"
  ON public.wk_shadow_weekly_reports FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));