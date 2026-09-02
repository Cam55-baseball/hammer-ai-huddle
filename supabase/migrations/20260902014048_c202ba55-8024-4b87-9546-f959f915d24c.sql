ALTER TABLE public.videos
  ADD COLUMN IF NOT EXISTS capture_source text,
  ADD COLUMN IF NOT EXISTS requested_fps numeric,
  ADD COLUMN IF NOT EXISTS achieved_fps numeric,
  ADD COLUMN IF NOT EXISTS capture_fps_tier text,
  ADD COLUMN IF NOT EXISTS capture_fps_source text;

COMMENT ON COLUMN public.videos.capture_source IS 'in_app_capture | delaycam | upload';
COMMENT ON COLUMN public.videos.achieved_fps IS 'Frame rate actually delivered by the camera, measured from painted frames.';
COMMENT ON COLUMN public.videos.capture_fps_tier IS 'elite | good | limited | unusable';
COMMENT ON COLUMN public.videos.capture_fps_source IS 'measured | track_settings | capabilities | file_probe';