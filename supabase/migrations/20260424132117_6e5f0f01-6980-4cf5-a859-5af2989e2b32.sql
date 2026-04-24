-- =========================================================
-- PART 1: engine_snapshot_versions
-- =========================================================
CREATE TABLE public.engine_snapshot_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_id uuid NOT NULL REFERENCES public.hammer_state_snapshots(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  engine_version text NOT NULL DEFAULT 'v1.0.0',
  weights jsonb NOT NULL DEFAULT '{}'::jsonb,
  profile jsonb,
  inputs jsonb NOT NULL DEFAULT '{}'::jsonb,
  output jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_esv_user_created ON public.engine_snapshot_versions(user_id, created_at DESC);
CREATE INDEX idx_esv_snapshot ON public.engine_snapshot_versions(snapshot_id);
CREATE INDEX idx_esv_version_created ON public.engine_snapshot_versions(engine_version, created_at DESC);

ALTER TABLE public.engine_snapshot_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own snapshot versions"
  ON public.engine_snapshot_versions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Owners and admins read all snapshot versions"
  ON public.engine_snapshot_versions FOR SELECT
  USING (public.user_has_role(auth.uid(), 'owner'::app_role) OR public.user_has_role(auth.uid(), 'admin'::app_role));

-- service role bypasses RLS automatically; no insert policy needed for clients

-- =========================================================
-- PART 2: engine_regression_results
-- =========================================================
CREATE TABLE public.engine_regression_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_at timestamptz NOT NULL DEFAULT now(),
  test_case text NOT NULL,
  baseline_snapshot_id uuid,
  baseline_state text NOT NULL,
  new_state text NOT NULL,
  drift_score int NOT NULL,
  pass boolean NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  user_id uuid
);

CREATE INDEX idx_err_run_at ON public.engine_regression_results(run_at DESC);
CREATE INDEX idx_err_pass_run ON public.engine_regression_results(pass, run_at DESC);

ALTER TABLE public.engine_regression_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners and admins read regression results"
  ON public.engine_regression_results FOR SELECT
  USING (public.user_has_role(auth.uid(), 'owner'::app_role) OR public.user_has_role(auth.uid(), 'admin'::app_role));

-- =========================================================
-- PART 3: engine_weight_history
-- =========================================================
CREATE TABLE public.engine_weight_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  axis text NOT NULL,
  weight numeric NOT NULL,
  delta numeric NOT NULL,
  source text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX idx_ewh_axis_created ON public.engine_weight_history(axis, created_at DESC);
CREATE INDEX idx_ewh_created ON public.engine_weight_history(created_at DESC);

ALTER TABLE public.engine_weight_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners and admins read weight history"
  ON public.engine_weight_history FOR SELECT
  USING (public.user_has_role(auth.uid(), 'owner'::app_role) OR public.user_has_role(auth.uid(), 'admin'::app_role));

-- =========================================================
-- PART 4: prediction_outcomes
-- =========================================================
CREATE TABLE public.prediction_outcomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prediction_id uuid NOT NULL REFERENCES public.engine_state_predictions(id) ON DELETE CASCADE,
  actual_state_24h text NOT NULL,
  actual_snapshot_id uuid,
  accuracy_score int NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_po_prediction_unique ON public.prediction_outcomes(prediction_id);
CREATE INDEX idx_po_created ON public.prediction_outcomes(created_at DESC);
CREATE INDEX idx_po_score_created ON public.prediction_outcomes(accuracy_score, created_at DESC);

ALTER TABLE public.prediction_outcomes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own prediction outcomes"
  ON public.prediction_outcomes FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.engine_state_predictions p
    WHERE p.id = prediction_outcomes.prediction_id
      AND p.user_id = auth.uid()
  ));

CREATE POLICY "Owners and admins read all prediction outcomes"
  ON public.prediction_outcomes FOR SELECT
  USING (public.user_has_role(auth.uid(), 'owner'::app_role) OR public.user_has_role(auth.uid(), 'admin'::app_role));

-- =========================================================
-- PART 5: engine_system_health
-- =========================================================
CREATE TABLE public.engine_system_health (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  score int NOT NULL,
  breakdown jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_esh_created ON public.engine_system_health(created_at DESC);

ALTER TABLE public.engine_system_health ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners and admins read system health"
  ON public.engine_system_health FOR SELECT
  USING (public.user_has_role(auth.uid(), 'owner'::app_role) OR public.user_has_role(auth.uid(), 'admin'::app_role));

-- Allow authenticated users to read latest system health (for UI badge)
CREATE POLICY "Authenticated read system health"
  ON public.engine_system_health FOR SELECT
  TO authenticated
  USING (true);

-- =========================================================
-- CLEANUP FUNCTIONS
-- =========================================================
CREATE OR REPLACE FUNCTION public.cleanup_old_snapshot_versions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE deleted_count integer;
BEGIN
  DELETE FROM public.engine_snapshot_versions WHERE created_at < now() - interval '180 days';
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  IF deleted_count > 0 THEN
    INSERT INTO public.audit_log (user_id, action, table_name, metadata)
    VALUES ('00000000-0000-0000-0000-000000000000'::uuid, 'automated_cleanup',
      'engine_snapshot_versions',
      jsonb_build_object('deleted_count', deleted_count, 'retention_days', 180));
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.cleanup_old_regression_results()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE deleted_count integer;
BEGIN
  DELETE FROM public.engine_regression_results WHERE run_at < now() - interval '90 days';
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  IF deleted_count > 0 THEN
    INSERT INTO public.audit_log (user_id, action, table_name, metadata)
    VALUES ('00000000-0000-0000-0000-000000000000'::uuid, 'automated_cleanup',
      'engine_regression_results',
      jsonb_build_object('deleted_count', deleted_count, 'retention_days', 90));
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.cleanup_old_weight_history()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE deleted_count integer;
BEGIN
  DELETE FROM public.engine_weight_history WHERE created_at < now() - interval '365 days';
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  IF deleted_count > 0 THEN
    INSERT INTO public.audit_log (user_id, action, table_name, metadata)
    VALUES ('00000000-0000-0000-0000-000000000000'::uuid, 'automated_cleanup',
      'engine_weight_history',
      jsonb_build_object('deleted_count', deleted_count, 'retention_days', 365));
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.cleanup_old_prediction_outcomes()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE deleted_count integer;
BEGIN
  DELETE FROM public.prediction_outcomes WHERE created_at < now() - interval '90 days';
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  IF deleted_count > 0 THEN
    INSERT INTO public.audit_log (user_id, action, table_name, metadata)
    VALUES ('00000000-0000-0000-0000-000000000000'::uuid, 'automated_cleanup',
      'prediction_outcomes',
      jsonb_build_object('deleted_count', deleted_count, 'retention_days', 90));
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.cleanup_old_system_health()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE deleted_count integer;
BEGIN
  DELETE FROM public.engine_system_health WHERE created_at < now() - interval '30 days';
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  IF deleted_count > 0 THEN
    INSERT INTO public.audit_log (user_id, action, table_name, metadata)
    VALUES ('00000000-0000-0000-0000-000000000000'::uuid, 'automated_cleanup',
      'engine_system_health',
      jsonb_build_object('deleted_count', deleted_count, 'retention_days', 30));
  END IF;
END;
$$;