ALTER TABLE public.demo_events
  ADD COLUMN IF NOT EXISTS session_id uuid;

CREATE INDEX IF NOT EXISTS idx_demo_events_session
  ON public.demo_events (session_id, created_at);

CREATE OR REPLACE VIEW public.demo_funnel
WITH (security_invoker = on)
AS
SELECT
  user_id,
  COUNT(*) FILTER (WHERE event_type = 'cta_viewed')        AS viewed,
  COUNT(*) FILTER (WHERE event_type = 'cta_clicked')       AS clicked,
  COUNT(*) FILTER (WHERE event_type = 'upgrade_started')   AS started,
  COUNT(*) FILTER (WHERE event_type = 'upgrade_completed') AS completed,
  MIN(created_at) AS first_event,
  MAX(created_at) AS last_event
FROM public.demo_events
GROUP BY user_id;