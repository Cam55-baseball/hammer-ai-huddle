-- Phase 7: Engine Function Logs
CREATE TABLE IF NOT EXISTS public.engine_function_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  function_name text NOT NULL,
  status text NOT NULL CHECK (status IN ('success','fail','timeout')),
  duration_ms integer,
  error_message text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_function_logs_name_created
  ON public.engine_function_logs(function_name, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_function_logs_status_created
  ON public.engine_function_logs(status, created_at DESC);

ALTER TABLE public.engine_function_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin/owner read function logs" ON public.engine_function_logs;
CREATE POLICY "Admin/owner read function logs"
  ON public.engine_function_logs
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));

DROP POLICY IF EXISTS "Service role writes function logs" ON public.engine_function_logs;
CREATE POLICY "Service role writes function logs"
  ON public.engine_function_logs
  FOR INSERT
  WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.cleanup_old_function_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE deleted_count integer;
BEGIN
  DELETE FROM public.engine_function_logs WHERE created_at < now() - interval '30 days';
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  IF deleted_count > 0 THEN
    INSERT INTO public.audit_log (user_id, action, table_name, metadata)
    VALUES ('00000000-0000-0000-0000-000000000000'::uuid, 'automated_cleanup',
      'engine_function_logs',
      jsonb_build_object('deleted_count', deleted_count, 'retention_days', 30));
  END IF;
END;
$$;

-- Phase 7: Scalability Moat — extend pattern library
ALTER TABLE public.anonymized_pattern_library
  ADD COLUMN IF NOT EXISTS performance_outcome_score numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS confidence numeric DEFAULT 0;

-- Admin-only ranked view
CREATE OR REPLACE VIEW public.pattern_library_ranked AS
SELECT
  apl.*,
  (apl.performance_outcome_score * apl.confidence / 100.0) AS rank_score
FROM public.anonymized_pattern_library apl
WHERE apl.confidence >= 30
ORDER BY (apl.performance_outcome_score * apl.confidence / 100.0) DESC;