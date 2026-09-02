ALTER TABLE public.cv_velocity_measurements
  DROP CONSTRAINT IF EXISTS cv_velocity_measurements_missingness_reason_check;

ALTER TABLE public.cv_velocity_measurements
  ADD CONSTRAINT cv_velocity_measurements_missingness_reason_check
  CHECK (missingness_reason IS NULL OR missingness_reason IN (
    'ball_not_detected',
    'insufficient_temporal_resolution',
    'capture_fps_below_tracking_floor'
  ));

ALTER TABLE public.cv_velocity_measurements
  ADD COLUMN IF NOT EXISTS capture_fps numeric,
  ADD COLUMN IF NOT EXISTS capture_fps_source text,
  ADD COLUMN IF NOT EXISTS missingness_detail text;

COMMENT ON COLUMN public.cv_velocity_measurements.capture_fps IS 'Best honest frame rate known for the source clip at measurement time.';
COMMENT ON COLUMN public.cv_velocity_measurements.capture_fps_source IS 'capture | file_probe | unknown';
COMMENT ON COLUMN public.cv_velocity_measurements.missingness_detail IS 'Plain-language, user-safe explanation of why a measurement is missing.';