-- Adversarial engine logs
CREATE TABLE IF NOT EXISTS public.engine_adversarial_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_at timestamptz NOT NULL DEFAULT now(),
  scenario text NOT NULL,
  user_id uuid NOT NULL,
  expected_state text NOT NULL,
  forbidden_states text[] NOT NULL DEFAULT ARRAY[]::text[],
  actual_state text,
  pass boolean NOT NULL,
  failure_reason text,
  inputs jsonb NOT NULL DEFAULT '{}'::jsonb,
  engine_output jsonb NOT NULL DEFAULT '{}'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_adversarial_run_at ON public.engine_adversarial_logs (run_at DESC);
CREATE INDEX IF NOT EXISTS idx_adversarial_pass_run_at ON public.engine_adversarial_logs (pass, run_at DESC);
CREATE INDEX IF NOT EXISTS idx_adversarial_scenario_run_at ON public.engine_adversarial_logs (scenario, run_at DESC);

ALTER TABLE public.engine_adversarial_logs ENABLE ROW LEVEL SECURITY;

-- Owner / admin can read; service role bypasses RLS for writes
CREATE POLICY "Owner or admin can read adversarial logs"
ON public.engine_adversarial_logs
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'owner'::app_role)
);

-- Cleanup function
CREATE OR REPLACE FUNCTION public.cleanup_old_adversarial_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM public.engine_adversarial_logs
  WHERE run_at < now() - interval '90 days';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  IF deleted_count > 0 THEN
    INSERT INTO public.audit_log (user_id, action, table_name, metadata)
    VALUES (
      '00000000-0000-0000-0000-000000000000'::uuid,
      'automated_cleanup',
      'engine_adversarial_logs',
      jsonb_build_object('deleted_count', deleted_count, 'retention_days', 90)
    );
  END IF;
END;
$function$;