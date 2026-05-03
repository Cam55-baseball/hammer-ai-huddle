CREATE UNIQUE INDEX IF NOT EXISTS follower_reports_unique_key
  ON public.follower_reports (follower_id, player_id, report_type, period_start);

ALTER TABLE public.follower_report_logs
  ADD COLUMN IF NOT EXISTS retryable boolean NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_follower_report_logs_retry
  ON public.follower_report_logs (created_at)
  WHERE status = 'failed' AND retryable = true;