-- Engine heartbeat monitoring table
CREATE TABLE public.engine_heartbeat_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_at timestamptz NOT NULL DEFAULT now(),
  success boolean NOT NULL,
  latency_ms integer,
  failure_reason text,
  failure_check text,
  hie_snapshot_age_ms integer,
  hammer_snapshot_age_ms integer,
  completions_in_aggregation integer,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX idx_heartbeat_run_at ON public.engine_heartbeat_logs (run_at DESC);
CREATE INDEX idx_heartbeat_success_run_at ON public.engine_heartbeat_logs (success, run_at DESC);

ALTER TABLE public.engine_heartbeat_logs ENABLE ROW LEVEL SECURITY;

-- Owner/admin read access
CREATE POLICY "Owners and admins can view heartbeat logs"
ON public.engine_heartbeat_logs
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'owner'::app_role)
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

-- No INSERT/UPDATE/DELETE policies → only service role can write (bypasses RLS)

-- Retention cleanup function: deletes rows older than 30 days
CREATE OR REPLACE FUNCTION public.cleanup_old_heartbeat_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM public.engine_heartbeat_logs
  WHERE run_at < now() - interval '30 days';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  IF deleted_count > 0 THEN
    INSERT INTO public.audit_log (user_id, action, table_name, metadata)
    VALUES (
      '00000000-0000-0000-0000-000000000000'::uuid,
      'automated_cleanup',
      'engine_heartbeat_logs',
      jsonb_build_object('deleted_count', deleted_count, 'retention_days', 30)
    );
  END IF;
END;
$$;