
ALTER TABLE public.wk_feature_switch_audit
  ADD COLUMN IF NOT EXISTS reason text,
  ADD COLUMN IF NOT EXISTS automatic boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.wk_feature_error_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_key text NOT NULL,
  user_id uuid,
  error_text text,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.wk_feature_error_events TO authenticated;
GRANT ALL ON public.wk_feature_error_events TO service_role;
ALTER TABLE public.wk_feature_error_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read feature errors" ON public.wk_feature_error_events
  FOR SELECT TO authenticated USING (public.is_training_intel_owner(auth.uid()));
CREATE INDEX IF NOT EXISTS wk_feature_error_events_key_time_idx
  ON public.wk_feature_error_events (feature_key, occurred_at DESC);

CREATE TABLE IF NOT EXISTS public.wk_rollout_baselines (
  feature_key text PRIMARY KEY,
  baseline_errors_per_day integer NOT NULL DEFAULT 0,
  note text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.wk_rollout_baselines TO authenticated;
GRANT ALL ON public.wk_rollout_baselines TO service_role;
ALTER TABLE public.wk_rollout_baselines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read rollout baselines" ON public.wk_rollout_baselines
  FOR SELECT TO authenticated USING (public.is_training_intel_owner(auth.uid()));
CREATE TRIGGER wk_rollout_baselines_updated_at
  BEFORE UPDATE ON public.wk_rollout_baselines
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.wk_rollout_baselines (feature_key, baseline_errors_per_day, note)
VALUES
  ('rest_day_calculator', 0, 'Step 11 shipped with zero card-build errors'),
  ('one_tap_logging', 0, 'Step 11 shipped with zero card-build errors')
ON CONFLICT (feature_key) DO NOTHING;

CREATE INDEX IF NOT EXISTS hammer_state_explanations_v2_created_at_idx
  ON public.hammer_state_explanations_v2 (created_at);

CREATE OR REPLACE FUNCTION public.cleanup_old_explanations()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  batch integer;
  total integer := 0;
  loops integer := 0;
BEGIN
  LOOP
    DELETE FROM public.hammer_state_explanations_v2
    WHERE id IN (
      SELECT id FROM public.hammer_state_explanations_v2
      WHERE created_at < now() - interval '90 days'
      LIMIT 5000
    );
    GET DIAGNOSTICS batch = ROW_COUNT;
    total := total + batch;
    loops := loops + 1;
    EXIT WHEN batch = 0 OR loops >= 200;
  END LOOP;

  IF total > 0 THEN
    INSERT INTO public.audit_log (user_id, action, table_name, metadata)
    VALUES ('00000000-0000-0000-0000-000000000000'::uuid, 'automated_cleanup',
      'hammer_state_explanations_v2',
      jsonb_build_object('deleted_count', total, 'batches', loops, 'retention_days', 90));
  END IF;
END;
$$;
