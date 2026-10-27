CREATE TABLE public.analysis_canary_config (
 id integer PRIMARY KEY DEFAULT 1 CHECK (id=1), owner_id uuid NOT NULL, video_id uuid NOT NULL, request_path text NOT NULL, enabled boolean NOT NULL DEFAULT false, paused_reason text, lease_id uuid, lease_until timestamptz, last_run_day date, last_status text, updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.analysis_canary_config TO authenticated;
GRANT ALL ON public.analysis_canary_config TO service_role;
ALTER TABLE public.analysis_canary_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner reads canary state" ON public.analysis_canary_config FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'owner'::public.app_role));
CREATE OR REPLACE FUNCTION public.claim_analysis_canary(p_lease uuid) RETURNS SETOF public.analysis_canary_config LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$
 UPDATE public.analysis_canary_config SET lease_id=p_lease,lease_until=now()+interval '5 minutes',last_run_day=current_date,last_status='running',updated_at=now()
 WHERE id=1 AND enabled AND paused_reason IS NULL AND (lease_until IS NULL OR lease_until<now()) AND (last_run_day IS NULL OR last_run_day<current_date)
 RETURNING *;
$$;
REVOKE ALL ON FUNCTION public.claim_analysis_canary(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_analysis_canary(uuid) TO service_role;