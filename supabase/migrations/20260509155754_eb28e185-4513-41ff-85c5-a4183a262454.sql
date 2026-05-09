
CREATE TABLE public.foundation_health_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_key text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('info','warning','critical')),
  title text NOT NULL,
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at  timestamptz NOT NULL DEFAULT now(),
  resolved_at   timestamptz
);

-- Only one OPEN alert per key (resolved_at IS NULL). Multiple historical
-- resolved rows allowed.
CREATE UNIQUE INDEX uq_fha_open_key
  ON public.foundation_health_alerts (alert_key)
  WHERE resolved_at IS NULL;

CREATE INDEX idx_fha_open
  ON public.foundation_health_alerts (severity, last_seen_at DESC)
  WHERE resolved_at IS NULL;

ALTER TABLE public.foundation_health_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read foundation health alerts"
  ON public.foundation_health_alerts
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));
