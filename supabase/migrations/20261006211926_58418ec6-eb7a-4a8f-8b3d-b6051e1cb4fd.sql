ALTER TABLE public.wk_daily_plan_runs ADD COLUMN IF NOT EXISTS duration_ms integer;
CREATE TABLE IF NOT EXISTS public.wk_plan_build_claims (
  user_id uuid NOT NULL,
  plan_date date NOT NULL,
  claimed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, plan_date)
);
GRANT ALL ON public.wk_plan_build_claims TO service_role;
ALTER TABLE public.wk_plan_build_claims ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners and admins read build claims" ON public.wk_plan_build_claims FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'owner') OR public.has_role(auth.uid(),'admin'));
GRANT SELECT ON public.wk_plan_build_claims TO authenticated;

-- Atomic claim: true only for the one caller that gets it (a claim older than 10 minutes may be retaken).
CREATE OR REPLACE FUNCTION public.wk_claim_plan_build(_user uuid, _day date)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE got int;
BEGIN
  INSERT INTO public.wk_plan_build_claims(user_id, plan_date) VALUES (_user, _day)
  ON CONFLICT (user_id, plan_date) DO UPDATE SET claimed_at = now()
    WHERE public.wk_plan_build_claims.claimed_at < now() - interval '10 minutes';
  GET DIAGNOSTICS got = ROW_COUNT;
  RETURN got = 1;
END $$;
REVOKE ALL ON FUNCTION public.wk_claim_plan_build(uuid, date) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.wk_claim_plan_build(uuid, date) TO service_role;