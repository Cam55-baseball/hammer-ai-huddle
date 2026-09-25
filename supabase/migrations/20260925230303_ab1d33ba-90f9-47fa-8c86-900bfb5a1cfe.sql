CREATE TABLE public.delaycam_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  video_id uuid REFERENCES public.videos(id) ON DELETE SET NULL,
  sport text NOT NULL,
  module text NOT NULL,
  side_stamp jsonb NOT NULL DEFAULT '{}'::jsonb,
  started_at timestamptz NOT NULL,
  ended_at timestamptz,
  duration_sec numeric,
  requested_fps numeric,
  achieved_fps numeric,
  fps_tier text,
  fps_source text,
  display_metrics_on boolean NOT NULL DEFAULT false,
  processing_state text NOT NULL DEFAULT 'recorded',
  processing_error text,
  rep_detection_state text NOT NULL DEFAULT 'not_run',
  rep_detection_reason text,
  boundary_log jsonb NOT NULL DEFAULT '[]'::jsonb,
  landmark_run_id uuid REFERENCES public.video_landmark_runs(id) ON DELETE SET NULL,
  engine_version text,
  splitter_version text,
  summary jsonb,
  summary_version text,
  analyzed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.delaycam_sessions TO authenticated;
GRANT ALL ON public.delaycam_sessions TO service_role;
ALTER TABLE public.delaycam_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own delaycam sessions read" ON public.delaycam_sessions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own delaycam sessions insert" ON public.delaycam_sessions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own delaycam sessions update" ON public.delaycam_sessions FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX delaycam_sessions_user_created_idx ON public.delaycam_sessions (user_id, created_at DESC);
CREATE TRIGGER delaycam_sessions_updated_at BEFORE UPDATE ON public.delaycam_sessions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.delaycam_reps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.delaycam_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  rep_index integer NOT NULL,
  start_ms integer NOT NULL,
  end_ms integer NOT NULL,
  anchor_ms integer,
  fps_measured numeric,
  fps_tier text,
  boundary_confidence numeric,
  boundary_signals jsonb NOT NULL DEFAULT '{}'::jsonb,
  metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  engine_version text,
  splitter_version text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, rep_index, splitter_version)
);
GRANT SELECT, INSERT, UPDATE ON public.delaycam_reps TO authenticated;
GRANT ALL ON public.delaycam_reps TO service_role;
ALTER TABLE public.delaycam_reps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own delaycam reps read" ON public.delaycam_reps FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own delaycam reps insert" ON public.delaycam_reps FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.delaycam_sessions s WHERE s.id = session_id AND s.user_id = auth.uid()));
CREATE POLICY "own delaycam reps update" ON public.delaycam_reps FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX delaycam_reps_session_idx ON public.delaycam_reps (session_id, rep_index);
CREATE TRIGGER delaycam_reps_updated_at BEFORE UPDATE ON public.delaycam_reps FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();