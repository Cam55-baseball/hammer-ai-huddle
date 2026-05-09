
-- Foundation recommendation observability backbone (Wave A)
CREATE TABLE IF NOT EXISTS public.foundation_recommendation_traces (
  trace_id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  video_id UUID NOT NULL,
  surface_origin TEXT NOT NULL CHECK (surface_origin IN (
    'library','hammer','today_tip','onboarding','recovery_flow','admin_replay'
  )),
  active_triggers TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  matched_triggers TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  raw_score NUMERIC,
  final_score NUMERIC,
  score_breakdown JSONB NOT NULL DEFAULT '{}'::jsonb,
  recommendation_version INTEGER NOT NULL DEFAULT 1,
  engine_version TEXT,
  snapshot_version TEXT,
  foundation_meta_version INTEGER,
  suppressed BOOLEAN NOT NULL DEFAULT false,
  suppression_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_frt_user_created
  ON public.foundation_recommendation_traces (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_frt_video_created
  ON public.foundation_recommendation_traces (video_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_frt_active_triggers
  ON public.foundation_recommendation_traces USING GIN (active_triggers);
CREATE INDEX IF NOT EXISTS idx_frt_suppressed
  ON public.foundation_recommendation_traces (created_at DESC) WHERE suppressed = true;

ALTER TABLE public.foundation_recommendation_traces ENABLE ROW LEVEL SECURITY;

-- Athletes see only their own traces.
CREATE POLICY "Users view own foundation traces"
  ON public.foundation_recommendation_traces
  FOR SELECT
  USING (auth.uid() = user_id);

-- Admins see all.
CREATE POLICY "Admins view all foundation traces"
  ON public.foundation_recommendation_traces
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Authenticated users insert their own traces (client-side surfacing).
CREATE POLICY "Users insert own foundation traces"
  ON public.foundation_recommendation_traces
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 90-day retention cleanup (cron-callable).
CREATE OR REPLACE FUNCTION public.cleanup_old_foundation_traces()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE deleted_count INTEGER;
BEGIN
  DELETE FROM public.foundation_recommendation_traces
  WHERE created_at < now() - interval '90 days';
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  IF deleted_count > 0 THEN
    INSERT INTO public.audit_log (user_id, action, table_name, metadata)
    VALUES (
      '00000000-0000-0000-0000-000000000000'::uuid,
      'automated_cleanup',
      'foundation_recommendation_traces',
      jsonb_build_object('deleted_count', deleted_count, 'retention_days', 90)
    );
  END IF;
END;
$$;
