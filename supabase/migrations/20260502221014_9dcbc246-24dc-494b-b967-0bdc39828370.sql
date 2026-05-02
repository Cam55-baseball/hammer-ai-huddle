
-- Idempotency at DB level
ALTER TABLE public.follower_reports
  ADD CONSTRAINT unique_follower_player_period
  UNIQUE (follower_id, player_id, report_type, period_start);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_sessions_user_date
  ON public.performance_sessions(user_id, session_date);
CREATE INDEX IF NOT EXISTS idx_games_user_date
  ON public.games(user_id, game_date);
CREATE INDEX IF NOT EXISTS idx_reports_lookup
  ON public.follower_reports(follower_id, player_id);

-- Observability log table
CREATE TABLE public.follower_report_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id uuid,
  player_id uuid,
  report_type text,
  status text NOT NULL CHECK (status IN ('success','skipped','failed')),
  reason text,
  error text,
  duration_ms integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_follower_report_logs_created
  ON public.follower_report_logs(created_at DESC);
CREATE INDEX idx_follower_report_logs_status
  ON public.follower_report_logs(status, created_at DESC);

ALTER TABLE public.follower_report_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read follower report logs"
  ON public.follower_report_logs
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));
