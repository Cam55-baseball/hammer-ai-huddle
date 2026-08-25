CREATE TABLE public.cv_calibration_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  video_id uuid NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  reference_distance_ft numeric(8,3) NOT NULL CHECK (reference_distance_ft > 0 AND reference_distance_ft <= 500),
  calibration_status text NOT NULL DEFAULT 'pending' CHECK (calibration_status IN ('pending', 'processing', 'frames_ready', 'failed')),
  failure_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cv_calibration_sessions TO authenticated;
GRANT ALL ON public.cv_calibration_sessions TO service_role;

ALTER TABLE public.cv_calibration_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own calibration sessions"
  ON public.cv_calibration_sessions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create calibration sessions for their own videos"
  ON public.cv_calibration_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1
      FROM public.videos v
      WHERE v.id = video_id
        AND v.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own calibration sessions"
  ON public.cv_calibration_sessions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1
      FROM public.videos v
      WHERE v.id = video_id
        AND v.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own calibration sessions"
  ON public.cv_calibration_sessions
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE TABLE public.cv_calibration_frames (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  calibration_session_id uuid NOT NULL REFERENCES public.cv_calibration_sessions(id) ON DELETE CASCADE,
  frame_index integer NOT NULL CHECK (frame_index >= 0),
  timestamp_seconds numeric(12,6) NOT NULL CHECK (timestamp_seconds >= 0),
  storage_path text NOT NULL,
  sha256_hex text NOT NULL,
  width integer NOT NULL CHECK (width > 0),
  height integer NOT NULL CHECK (height > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (calibration_session_id, frame_index)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cv_calibration_frames TO authenticated;
GRANT ALL ON public.cv_calibration_frames TO service_role;

ALTER TABLE public.cv_calibration_frames ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own calibration frames"
  ON public.cv_calibration_frames
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.cv_calibration_sessions s
      WHERE s.id = calibration_session_id
        AND s.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create frames for their own calibration sessions"
  ON public.cv_calibration_frames
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.cv_calibration_sessions s
      WHERE s.id = calibration_session_id
        AND s.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own calibration frames"
  ON public.cv_calibration_frames
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.cv_calibration_sessions s
      WHERE s.id = calibration_session_id
        AND s.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.cv_calibration_sessions s
      WHERE s.id = calibration_session_id
        AND s.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own calibration frames"
  ON public.cv_calibration_frames
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.cv_calibration_sessions s
      WHERE s.id = calibration_session_id
        AND s.user_id = auth.uid()
    )
  );

CREATE OR REPLACE FUNCTION public.cv_calibration_sessions_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_cv_calibration_sessions_updated_at
  BEFORE UPDATE ON public.cv_calibration_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.cv_calibration_sessions_touch_updated_at();

CREATE INDEX idx_cv_calibration_sessions_user_created
  ON public.cv_calibration_sessions (user_id, created_at DESC);

CREATE INDEX idx_cv_calibration_sessions_video
  ON public.cv_calibration_sessions (video_id);

CREATE INDEX idx_cv_calibration_frames_session
  ON public.cv_calibration_frames (calibration_session_id, frame_index);