ALTER TABLE public.wk_session_logs
  ADD COLUMN IF NOT EXISTS metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS ai_readback text;

CREATE INDEX IF NOT EXISTS wk_session_logs_user_movement_date_idx
  ON public.wk_session_logs (user_id, movement_slug, plan_date DESC);