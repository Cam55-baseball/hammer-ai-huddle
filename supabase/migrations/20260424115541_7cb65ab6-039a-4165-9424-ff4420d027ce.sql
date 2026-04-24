-- Engine Sentinel logs table
CREATE TABLE public.engine_sentinel_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid NOT NULL,
  expected_state text NOT NULL,
  actual_state text,
  drift_score integer NOT NULL DEFAULT 0,
  drift_flag boolean NOT NULL DEFAULT false,
  failure_reason text,
  inputs_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  engine_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX idx_sentinel_logs_run_at ON public.engine_sentinel_logs (run_at DESC);
CREATE INDEX idx_sentinel_logs_drift_flag ON public.engine_sentinel_logs (drift_flag, run_at DESC);
CREATE INDEX idx_sentinel_logs_user_id ON public.engine_sentinel_logs (user_id, run_at DESC);

ALTER TABLE public.engine_sentinel_logs ENABLE ROW LEVEL SECURITY;

-- Read = owner or admin only
CREATE POLICY "Owners and admins can read sentinel logs"
ON public.engine_sentinel_logs
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'owner'::app_role)
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

-- No client INSERT/UPDATE/DELETE policies → service role only

-- Cleanup function (60d retention)
CREATE OR REPLACE FUNCTION public.cleanup_old_sentinel_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM public.engine_sentinel_logs
  WHERE run_at < now() - interval '60 days';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  IF deleted_count > 0 THEN
    INSERT INTO public.audit_log (user_id, action, table_name, metadata)
    VALUES (
      '00000000-0000-0000-0000-000000000000'::uuid,
      'automated_cleanup',
      'engine_sentinel_logs',
      jsonb_build_object('deleted_count', deleted_count, 'retention_days', 60)
    );
  END IF;
END;
$$;