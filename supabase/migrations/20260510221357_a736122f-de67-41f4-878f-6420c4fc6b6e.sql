-- Owner alert center table
CREATE TABLE IF NOT EXISTS public.owner_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_key text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('info','warning','critical')),
  title text NOT NULL,
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  minute_bucket timestamptz NOT NULL,
  acknowledged_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  acknowledged_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Idempotency: one row per (alert_key, minute_bucket)
CREATE UNIQUE INDEX IF NOT EXISTS owner_alerts_key_bucket_uidx
  ON public.owner_alerts (alert_key, minute_bucket);

CREATE INDEX IF NOT EXISTS owner_alerts_unack_idx
  ON public.owner_alerts (created_at DESC)
  WHERE acknowledged_at IS NULL;

CREATE INDEX IF NOT EXISTS owner_alerts_severity_idx
  ON public.owner_alerts (severity, created_at DESC);

-- RLS: owner-only
ALTER TABLE public.owner_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view alerts"
  ON public.owner_alerts FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'owner'));

CREATE POLICY "Owners can acknowledge alerts"
  ON public.owner_alerts FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'owner'))
  WITH CHECK (public.has_role(auth.uid(), 'owner'));

CREATE POLICY "Owners can insert test alerts"
  ON public.owner_alerts FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'owner'));

-- Realtime
ALTER TABLE public.owner_alerts REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.owner_alerts;