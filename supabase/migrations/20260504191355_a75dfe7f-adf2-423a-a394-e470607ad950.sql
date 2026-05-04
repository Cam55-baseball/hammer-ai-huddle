ALTER TABLE public.follower_report_logs
  ADD COLUMN IF NOT EXISTS period_start date;

CREATE INDEX IF NOT EXISTS idx_follower_report_logs_retry_full
  ON public.follower_report_logs (created_at, follower_id, player_id, report_type, period_start)
  WHERE status = 'failed' AND retryable = true;