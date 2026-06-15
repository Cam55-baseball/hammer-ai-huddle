
-- ============================================================
-- Phase 0 — Determinism Foundation
-- ============================================================

-- 1) Extend videos with deterministic input fields
ALTER TABLE public.videos
  ADD COLUMN IF NOT EXISTS sha256_hex text,
  ADD COLUMN IF NOT EXISTS fps_true numeric,
  ADD COLUMN IF NOT EXISTS duration_sec numeric,
  ADD COLUMN IF NOT EXISTS width integer,
  ADD COLUMN IF NOT EXISTS height integer,
  ADD COLUMN IF NOT EXISTS orientation text,
  ADD COLUMN IF NOT EXISTS landing_time_sec numeric,
  ADD COLUMN IF NOT EXISTS calibration_h_px numeric,
  ADD COLUMN IF NOT EXISTS direction_sign smallint;

CREATE INDEX IF NOT EXISTS idx_videos_sha256_hex ON public.videos(sha256_hex);

-- Shared updated_at trigger function
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ============================================================
-- 2) video_landmark_runs
-- ============================================================
CREATE TABLE IF NOT EXISTS public.video_landmark_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id uuid NOT NULL,
  landmark_model_id text NOT NULL,
  landmark_model_version text NOT NULL,
  fps_true numeric NOT NULL,
  frame_count integer NOT NULL,
  landmarks_storage_path text NOT NULL,
  landmarks_sha256_hex text NOT NULL,
  mean_visibility numeric,
  diagnostics jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_video_landmark_runs_video_model
  ON public.video_landmark_runs (video_id, landmark_model_version);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.video_landmark_runs TO authenticated;
GRANT ALL ON public.video_landmark_runs TO service_role;

ALTER TABLE public.video_landmark_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner reads landmark runs"
ON public.video_landmark_runs FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.videos v
  WHERE v.id = video_landmark_runs.video_id
    AND v.user_id = auth.uid()
));

CREATE TRIGGER trg_video_landmark_runs_updated_at
BEFORE UPDATE ON public.video_landmark_runs
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ============================================================
-- 3) video_event_runs
-- ============================================================
CREATE TABLE IF NOT EXISTS public.video_event_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id uuid NOT NULL,
  landmark_run_id uuid NOT NULL REFERENCES public.video_landmark_runs(id) ON DELETE CASCADE,
  detector_version text NOT NULL,
  events_jsonb jsonb NOT NULL,
  events_sha256_hex text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_video_event_runs_video_detector
  ON public.video_event_runs (video_id, detector_version);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.video_event_runs TO authenticated;
GRANT ALL ON public.video_event_runs TO service_role;

ALTER TABLE public.video_event_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner reads event runs"
ON public.video_event_runs FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.videos v
  WHERE v.id = video_event_runs.video_id
    AND v.user_id = auth.uid()
));

CREATE TRIGGER trg_video_event_runs_updated_at
BEFORE UPDATE ON public.video_event_runs
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ============================================================
-- 4) video_metric_runs
-- ============================================================
CREATE TABLE IF NOT EXISTS public.video_metric_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id uuid NOT NULL,
  landmark_run_id uuid NOT NULL REFERENCES public.video_landmark_runs(id) ON DELETE CASCADE,
  event_run_id uuid NOT NULL REFERENCES public.video_event_runs(id) ON DELETE CASCADE,
  metric_engine_version text NOT NULL,
  metrics_jsonb jsonb NOT NULL,
  metrics_sha256_hex text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_video_metric_runs_video_engine
  ON public.video_metric_runs (video_id, metric_engine_version);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.video_metric_runs TO authenticated;
GRANT ALL ON public.video_metric_runs TO service_role;

ALTER TABLE public.video_metric_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner reads metric runs"
ON public.video_metric_runs FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.videos v
  WHERE v.id = video_metric_runs.video_id
    AND v.user_id = auth.uid()
));

CREATE TRIGGER trg_video_metric_runs_updated_at
BEFORE UPDATE ON public.video_metric_runs
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ============================================================
-- 5) video_coaching_runs
-- ============================================================
CREATE TABLE IF NOT EXISTS public.video_coaching_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_run_id uuid NOT NULL REFERENCES public.video_metric_runs(id) ON DELETE CASCADE,
  ai_model_id text NOT NULL,
  ai_model_version text NOT NULL,
  prompt_sha256_hex text NOT NULL,
  narrative_jsonb jsonb NOT NULL DEFAULT '{}'::jsonb,
  drills_jsonb jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_video_coaching_runs_metric_run
  ON public.video_coaching_runs (metric_run_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.video_coaching_runs TO authenticated;
GRANT ALL ON public.video_coaching_runs TO service_role;

ALTER TABLE public.video_coaching_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner reads coaching runs"
ON public.video_coaching_runs FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1
  FROM public.video_metric_runs mr
  JOIN public.videos v ON v.id = mr.video_id
  WHERE mr.id = video_coaching_runs.metric_run_id
    AND v.user_id = auth.uid()
));

-- ============================================================
-- 6) video_analysis_runs (append-only audit trail)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.video_analysis_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id uuid NOT NULL,
  requested_by uuid,
  requested_at timestamptz NOT NULL DEFAULT now(),
  cache_fingerprint_hex text NOT NULL,
  cache_hit boolean NOT NULL DEFAULT false,
  video_sha256_hex text,
  landmark_model_version text,
  detector_version text,
  metric_engine_version text,
  fps_true numeric,
  frame_selection_jsonb jsonb NOT NULL DEFAULT '{}'::jsonb,
  event_selection_jsonb jsonb NOT NULL DEFAULT '{}'::jsonb,
  confidence_summary_jsonb jsonb NOT NULL DEFAULT '{}'::jsonb,
  landmark_run_id uuid REFERENCES public.video_landmark_runs(id) ON DELETE SET NULL,
  event_run_id uuid REFERENCES public.video_event_runs(id) ON DELETE SET NULL,
  metric_run_id uuid REFERENCES public.video_metric_runs(id) ON DELETE SET NULL,
  coaching_run_id uuid REFERENCES public.video_coaching_runs(id) ON DELETE SET NULL,
  outcome text NOT NULL,
  outcome_reason text
);

CREATE INDEX IF NOT EXISTS idx_video_analysis_runs_video ON public.video_analysis_runs (video_id);
CREATE INDEX IF NOT EXISTS idx_video_analysis_runs_fingerprint ON public.video_analysis_runs (cache_fingerprint_hex);
CREATE INDEX IF NOT EXISTS idx_video_analysis_runs_requested_at ON public.video_analysis_runs (requested_at DESC);

GRANT SELECT, INSERT ON public.video_analysis_runs TO authenticated;
GRANT ALL ON public.video_analysis_runs TO service_role;

ALTER TABLE public.video_analysis_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner reads analysis runs"
ON public.video_analysis_runs FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.videos v
  WHERE v.id = video_analysis_runs.video_id
    AND v.user_id = auth.uid()
));
