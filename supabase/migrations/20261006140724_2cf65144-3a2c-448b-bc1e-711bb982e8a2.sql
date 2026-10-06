ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS hammers_today_started_at timestamptz;

INSERT INTO public.wk_feature_switches (feature_key, label, mode, allowlist, buildable, sort_order)
VALUES ('hammers_today_start_gate', 'Start Hammers Today Plan gate', 'off', '{}', true, 130)
ON CONFLICT (feature_key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.start_hammers_today()
RETURNS timestamptz
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v timestamptz;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not signed in'; END IF;
  UPDATE public.profiles SET hammers_today_started_at = now()
   WHERE id = auth.uid() AND hammers_today_started_at IS NULL;
  SELECT hammers_today_started_at INTO v FROM public.profiles WHERE id = auth.uid();
  RETURN v;
END $$;
REVOKE ALL ON FUNCTION public.start_hammers_today() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.start_hammers_today() TO authenticated;

-- Players may not set or clear the start date by editing their profile directly.
CREATE OR REPLACE FUNCTION public.guard_hammers_today_started_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.hammers_today_started_at IS DISTINCT FROM OLD.hammers_today_started_at
     AND current_setting('request.jwt.claims', true)::jsonb ->> 'role' = 'authenticated'
     AND current_user = 'authenticated' THEN
    NEW.hammers_today_started_at := OLD.hammers_today_started_at;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_guard_hammers_today_started_at ON public.profiles;
CREATE TRIGGER trg_guard_hammers_today_started_at BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.guard_hammers_today_started_at();

CREATE TABLE public.wk_daily_plan_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  plan_date date NOT NULL,
  mode text NOT NULL,
  outcome text NOT NULL,
  error_text text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.wk_daily_plan_runs TO service_role;
ALTER TABLE public.wk_daily_plan_runs ENABLE ROW LEVEL SECURITY;
CREATE INDEX wk_daily_plan_runs_date_idx ON public.wk_daily_plan_runs (plan_date, outcome);

CREATE TABLE public.wk_final_check_swaps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  plan_date date NOT NULL,
  rule text NOT NULL,
  movement_slug text,
  slot text,
  detail text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.wk_final_check_swaps TO authenticated;
GRANT ALL ON public.wk_final_check_swaps TO service_role;
ALTER TABLE public.wk_final_check_swaps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Players read their own rule-check swaps" ON public.wk_final_check_swaps
FOR SELECT TO authenticated USING (auth.uid() = user_id);