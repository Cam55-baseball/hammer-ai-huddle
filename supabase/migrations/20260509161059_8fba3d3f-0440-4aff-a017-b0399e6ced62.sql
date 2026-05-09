-- Phase H stabilization: foundation_health_alerts hardening (additive only).

-- Index for the open-key upsert lookup used by foundation-health-alerts.
CREATE INDEX IF NOT EXISTS idx_fha_key_resolved
  ON public.foundation_health_alerts (alert_key, resolved_at);

-- Index to make resolution audits fast.
CREATE INDEX IF NOT EXISTS idx_fha_resolved_at
  ON public.foundation_health_alerts (resolved_at DESC)
  WHERE resolved_at IS NOT NULL;

-- Explicit service-role write policy. service_role bypasses RLS today, but
-- this makes intent reviewable and survives any future FORCE RLS flip.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'foundation_health_alerts'
      AND policyname = 'Service role manages foundation health alerts'
  ) THEN
    CREATE POLICY "Service role manages foundation health alerts"
      ON public.foundation_health_alerts
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

COMMENT ON TABLE public.foundation_health_alerts IS
  'Phase H3: persisted health alerts. One open row per alert_key (uq_fha_open_key). Auto-resolved by foundation-health-alerts edge function when the underlying condition clears.';