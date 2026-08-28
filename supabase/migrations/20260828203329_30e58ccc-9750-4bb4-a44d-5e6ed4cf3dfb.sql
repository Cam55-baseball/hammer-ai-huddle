ALTER TABLE public.video_metric_runs
  ADD COLUMN IF NOT EXISTS delivery_type text
  CHECK (delivery_type IS NULL OR delivery_type IN ('windup','stretch'));