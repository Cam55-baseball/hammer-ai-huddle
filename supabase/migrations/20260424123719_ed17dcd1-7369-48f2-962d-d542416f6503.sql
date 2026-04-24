
-- ============================================================================
-- PART 1: Self-Healing Weight Adjustment Layer
-- ============================================================================

CREATE TABLE public.engine_weight_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  source text NOT NULL CHECK (source IN ('sentinel', 'adversarial', 'advisory')),
  scenario text,
  drift_score int CHECK (drift_score IS NULL OR (drift_score >= 0 AND drift_score <= 100)),
  affected_axis text NOT NULL CHECK (affected_axis IN ('arousal', 'recovery', 'motor', 'cognitive', 'dopamine')),
  suggested_delta numeric NOT NULL CHECK (suggested_delta >= -0.05 AND suggested_delta <= 0.05),
  applied boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX idx_ewa_created_at ON public.engine_weight_adjustments (created_at DESC);
CREATE INDEX idx_ewa_applied_created ON public.engine_weight_adjustments (applied, created_at DESC);

ALTER TABLE public.engine_weight_adjustments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can read engine_weight_adjustments"
  ON public.engine_weight_adjustments FOR SELECT
  USING (public.has_role(auth.uid(), 'owner'::app_role));

CREATE TABLE public.engine_dynamic_weights (
  axis text PRIMARY KEY CHECK (axis IN ('arousal', 'recovery', 'motor', 'cognitive', 'dopamine')),
  weight numeric NOT NULL DEFAULT 1.0 CHECK (weight >= 0.5 AND weight <= 1.5),
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_run_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

ALTER TABLE public.engine_dynamic_weights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can read engine_dynamic_weights"
  ON public.engine_dynamic_weights FOR SELECT
  USING (public.has_role(auth.uid(), 'owner'::app_role));

-- ============================================================================
-- PART 2: Elite Athlete Experience Layer
-- ============================================================================

CREATE TABLE public.hammer_state_explanations_v2 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  snapshot_id uuid NOT NULL REFERENCES public.hammer_state_snapshots(id) ON DELETE CASCADE,
  state text NOT NULL CHECK (state IN ('prime', 'ready', 'caution', 'recover')),
  elite_message text NOT NULL,
  micro_directive text NOT NULL,
  constraint_text text NOT NULL,
  confidence int NOT NULL DEFAULT 0 CHECK (confidence >= 0 AND confidence <= 100),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_hse_user_created ON public.hammer_state_explanations_v2 (user_id, created_at DESC);
CREATE INDEX idx_hse_snapshot ON public.hammer_state_explanations_v2 (snapshot_id);

ALTER TABLE public.hammer_state_explanations_v2 ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own elite explanations"
  ON public.hammer_state_explanations_v2 FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Owner views all elite explanations"
  ON public.hammer_state_explanations_v2 FOR SELECT
  USING (public.has_role(auth.uid(), 'owner'::app_role));

ALTER PUBLICATION supabase_realtime ADD TABLE public.hammer_state_explanations_v2;

-- ============================================================================
-- PART 3: Competitive Moat (Pattern Library + Personalization)
-- ============================================================================

CREATE TABLE public.anonymized_pattern_library (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern_type text NOT NULL CHECK (pattern_type IN ('overload', 'recovery', 'inconsistency', 'ramp', 'plateau', 'mixed')),
  feature_vector jsonb NOT NULL,
  outcome_state text NOT NULL CHECK (outcome_state IN ('prime', 'ready', 'caution', 'recover')),
  frequency int NOT NULL DEFAULT 1,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_apl_type_outcome ON public.anonymized_pattern_library (pattern_type, outcome_state);
CREATE INDEX idx_apl_last_seen ON public.anonymized_pattern_library (last_seen_at DESC);

ALTER TABLE public.anonymized_pattern_library ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can read pattern library"
  ON public.anonymized_pattern_library FOR SELECT
  USING (public.has_role(auth.uid(), 'owner'::app_role));

CREATE TABLE public.user_engine_profile (
  user_id uuid PRIMARY KEY,
  sensitivity_to_load numeric NOT NULL DEFAULT 1.0 CHECK (sensitivity_to_load >= 0.5 AND sensitivity_to_load <= 1.5),
  recovery_speed numeric NOT NULL DEFAULT 1.0 CHECK (recovery_speed >= 0.5 AND recovery_speed <= 1.5),
  volatility_index numeric NOT NULL DEFAULT 0.0 CHECK (volatility_index >= 0 AND volatility_index <= 1),
  sample_size int NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_engine_profile ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own engine profile"
  ON public.user_engine_profile FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Owner views all engine profiles"
  ON public.user_engine_profile FOR SELECT
  USING (public.has_role(auth.uid(), 'owner'::app_role));

-- ============================================================================
-- PART 4: Adaptive Advisory Loop
-- ============================================================================

CREATE TABLE public.advisory_feedback_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  snapshot_id uuid REFERENCES public.hammer_state_snapshots(id) ON DELETE CASCADE,
  explanation_id uuid REFERENCES public.hammer_state_explanations_v2(id) ON DELETE SET NULL,
  advice_state text NOT NULL,
  advice_directive text,
  user_action_inferred text CHECK (user_action_inferred IN ('complied', 'partial', 'ignored', 'opposed')),
  effectiveness_score int CHECK (effectiveness_score IS NULL OR (effectiveness_score >= -100 AND effectiveness_score <= 100)),
  evaluation_window_hours int NOT NULL DEFAULT 24,
  created_at timestamptz NOT NULL DEFAULT now(),
  evaluated_at timestamptz
);

CREATE INDEX idx_afl_user_created ON public.advisory_feedback_logs (user_id, created_at DESC);
CREATE INDEX idx_afl_pending ON public.advisory_feedback_logs (evaluated_at, created_at) WHERE evaluated_at IS NULL;

ALTER TABLE public.advisory_feedback_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own advisory logs"
  ON public.advisory_feedback_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Owner views all advisory logs"
  ON public.advisory_feedback_logs FOR SELECT
  USING (public.has_role(auth.uid(), 'owner'::app_role));

-- ============================================================================
-- Retention cleanup functions
-- ============================================================================

CREATE OR REPLACE FUNCTION public.cleanup_old_weight_adjustments()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM public.engine_weight_adjustments
  WHERE created_at < now() - interval '180 days';
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  IF deleted_count > 0 THEN
    INSERT INTO public.audit_log (user_id, action, table_name, metadata)
    VALUES ('00000000-0000-0000-0000-000000000000'::uuid, 'automated_cleanup',
      'engine_weight_adjustments',
      jsonb_build_object('deleted_count', deleted_count, 'retention_days', 180));
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.cleanup_old_explanations()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM public.hammer_state_explanations_v2
  WHERE created_at < now() - interval '90 days';
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  IF deleted_count > 0 THEN
    INSERT INTO public.audit_log (user_id, action, table_name, metadata)
    VALUES ('00000000-0000-0000-0000-000000000000'::uuid, 'automated_cleanup',
      'hammer_state_explanations_v2',
      jsonb_build_object('deleted_count', deleted_count, 'retention_days', 90));
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.cleanup_old_advisory_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM public.advisory_feedback_logs
  WHERE created_at < now() - interval '90 days';
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  IF deleted_count > 0 THEN
    INSERT INTO public.audit_log (user_id, action, table_name, metadata)
    VALUES ('00000000-0000-0000-0000-000000000000'::uuid, 'automated_cleanup',
      'advisory_feedback_logs',
      jsonb_build_object('deleted_count', deleted_count, 'retention_days', 90));
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.cleanup_old_patterns()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM public.anonymized_pattern_library
  WHERE last_seen_at < now() - interval '180 days';
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  IF deleted_count > 0 THEN
    INSERT INTO public.audit_log (user_id, action, table_name, metadata)
    VALUES ('00000000-0000-0000-0000-000000000000'::uuid, 'automated_cleanup',
      'anonymized_pattern_library',
      jsonb_build_object('deleted_count', deleted_count, 'retention_days', 180));
  END IF;
END;
$$;
