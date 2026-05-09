
-- Companion table: fatigue decisions
CREATE TABLE public.foundation_fatigue_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  decided_at timestamptz NOT NULL DEFAULT now(),
  video_id uuid NOT NULL,
  kept boolean NOT NULL,
  reason text,
  exposure_score numeric,
  snapshot jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX idx_ffd_user_time ON public.foundation_fatigue_decisions (user_id, decided_at DESC);
CREATE INDEX idx_ffd_video ON public.foundation_fatigue_decisions (video_id);
ALTER TABLE public.foundation_fatigue_decisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users view own fatigue decisions"
  ON public.foundation_fatigue_decisions FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "admins view all fatigue decisions"
  ON public.foundation_fatigue_decisions FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "users insert own fatigue decisions"
  ON public.foundation_fatigue_decisions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Companion table: onboarding decisions
CREATE TABLE public.foundation_onboarding_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  decided_at timestamptz NOT NULL DEFAULT now(),
  video_id uuid NOT NULL,
  kept boolean NOT NULL,
  reason text,
  account_age_days integer,
  weekly_count integer,
  snapshot jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX idx_fod_user_time ON public.foundation_onboarding_decisions (user_id, decided_at DESC);
ALTER TABLE public.foundation_onboarding_decisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users view own onboarding decisions"
  ON public.foundation_onboarding_decisions FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "admins view all onboarding decisions"
  ON public.foundation_onboarding_decisions FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "users insert own onboarding decisions"
  ON public.foundation_onboarding_decisions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Cron heartbeat table
CREATE TABLE public.foundation_cron_heartbeats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  function_name text NOT NULL,
  ran_at timestamptz NOT NULL DEFAULT now(),
  duration_ms integer,
  status text NOT NULL DEFAULT 'ok',
  error text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX idx_fch_fn_time ON public.foundation_cron_heartbeats (function_name, ran_at DESC);
ALTER TABLE public.foundation_cron_heartbeats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins view heartbeats"
  ON public.foundation_cron_heartbeats FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Cleanup function (30d retention for decisions, 60d for heartbeats)
CREATE OR REPLACE FUNCTION public.cleanup_old_foundation_decisions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE d1 int; d2 int; d3 int;
BEGIN
  DELETE FROM public.foundation_fatigue_decisions
    WHERE decided_at < now() - interval '30 days';
  GET DIAGNOSTICS d1 = ROW_COUNT;
  DELETE FROM public.foundation_onboarding_decisions
    WHERE decided_at < now() - interval '30 days';
  GET DIAGNOSTICS d2 = ROW_COUNT;
  DELETE FROM public.foundation_cron_heartbeats
    WHERE ran_at < now() - interval '60 days';
  GET DIAGNOSTICS d3 = ROW_COUNT;
  IF (d1 + d2 + d3) > 0 THEN
    INSERT INTO public.audit_log (user_id, action, table_name, metadata)
    VALUES (
      '00000000-0000-0000-0000-000000000000'::uuid,
      'automated_cleanup',
      'foundation_decisions',
      jsonb_build_object('fatigue', d1, 'onboarding', d2, 'heartbeats', d3)
    );
  END IF;
END;
$$;
