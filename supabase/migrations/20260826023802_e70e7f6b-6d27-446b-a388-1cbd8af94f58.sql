ALTER TABLE public.cv_calibration_sessions
  DROP CONSTRAINT cv_calibration_sessions_calibration_status_check;

ALTER TABLE public.cv_calibration_sessions
  ADD CONSTRAINT cv_calibration_sessions_calibration_status_check
  CHECK (calibration_status IN (
    'pending',
    'processing',
    'frames_ready',
    'measuring',
    'measured',
    'low_confidence',
    'unavailable',
    'failed'
  ));

CREATE TABLE public.cv_velocity_measurements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  calibration_session_id uuid NOT NULL REFERENCES public.cv_calibration_sessions(id) ON DELETE CASCADE,
  video_id uuid NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('measured', 'low_confidence', 'unavailable')),
  velocity_mph numeric(6,2),
  confidence numeric(4,3),
  missingness_reason text CHECK (missingness_reason IN (
    'ball_not_detected',
    'insufficient_temporal_resolution'
  )),
  method text NOT NULL,
  model_id text NOT NULL,
  sport text NOT NULL CHECK (sport IN ('baseball', 'softball')),
  reference_distance_ft numeric(8,3) NOT NULL,
  frames_total integer NOT NULL CHECK (frames_total >= 0),
  frames_detected integer NOT NULL CHECK (frames_detected >= 0),
  frames_missed integer NOT NULL CHECK (frames_missed >= 0),
  roboflow_calls integer NOT NULL DEFAULT 0 CHECK (roboflow_calls >= 0),
  track_summary jsonb,
  pair_samples jsonb,
  detections jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.cv_velocity_measurements TO authenticated;
GRANT ALL ON public.cv_velocity_measurements TO service_role;

ALTER TABLE public.cv_velocity_measurements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own velocity measurements"
  ON public.cv_velocity_measurements
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX idx_cv_velocity_measurements_user_created
  ON public.cv_velocity_measurements (user_id, created_at DESC);

CREATE INDEX idx_cv_velocity_measurements_session
  ON public.cv_velocity_measurements (calibration_session_id);

CREATE INDEX idx_cv_velocity_measurements_video
  ON public.cv_velocity_measurements (video_id);