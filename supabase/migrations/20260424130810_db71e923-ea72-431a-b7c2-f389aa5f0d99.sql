-- Predictions table
CREATE TABLE public.engine_state_predictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  base_snapshot_id uuid REFERENCES public.hammer_state_snapshots(id) ON DELETE CASCADE,
  predicted_state_24h text NOT NULL,
  predicted_state_48h text NOT NULL,
  predicted_state_72h text NOT NULL,
  confidence_24h int NOT NULL,
  confidence_48h int NOT NULL,
  confidence_72h int NOT NULL,
  risk_flags text[] NOT NULL DEFAULT '{}',
  input_vector jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_predictions_user_created ON public.engine_state_predictions (user_id, created_at DESC);
CREATE INDEX idx_predictions_created ON public.engine_state_predictions (created_at DESC);

ALTER TABLE public.engine_state_predictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own predictions"
  ON public.engine_state_predictions FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- Interventions table
CREATE TABLE public.engine_interventions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  prediction_id uuid REFERENCES public.engine_state_predictions(id) ON DELETE CASCADE,
  trigger_reason text NOT NULL,
  intervention_type text NOT NULL,
  directive text NOT NULL,
  priority int NOT NULL DEFAULT 3,
  executed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_interventions_user_created ON public.engine_interventions (user_id, created_at DESC);
CREATE INDEX idx_interventions_executed ON public.engine_interventions (executed, created_at DESC);

ALTER TABLE public.engine_interventions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own interventions"
  ON public.engine_interventions FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- Add intervention link to advisory feedback logs
ALTER TABLE public.advisory_feedback_logs
  ADD COLUMN intervention_id uuid REFERENCES public.engine_interventions(id) ON DELETE SET NULL;

CREATE INDEX idx_advisory_feedback_intervention
  ON public.advisory_feedback_logs (intervention_id)
  WHERE intervention_id IS NOT NULL;

-- Cleanup routines
CREATE OR REPLACE FUNCTION public.cleanup_old_predictions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE deleted_count integer;
BEGIN
  DELETE FROM public.engine_state_predictions
  WHERE created_at < now() - interval '60 days';
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  IF deleted_count > 0 THEN
    INSERT INTO public.audit_log (user_id, action, table_name, metadata)
    VALUES ('00000000-0000-0000-0000-000000000000'::uuid, 'automated_cleanup',
      'engine_state_predictions',
      jsonb_build_object('deleted_count', deleted_count, 'retention_days', 60));
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.cleanup_old_interventions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE deleted_count integer;
BEGIN
  DELETE FROM public.engine_interventions
  WHERE created_at < now() - interval '90 days';
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  IF deleted_count > 0 THEN
    INSERT INTO public.audit_log (user_id, action, table_name, metadata)
    VALUES ('00000000-0000-0000-0000-000000000000'::uuid, 'automated_cleanup',
      'engine_interventions',
      jsonb_build_object('deleted_count', deleted_count, 'retention_days', 90));
  END IF;
END;
$$;