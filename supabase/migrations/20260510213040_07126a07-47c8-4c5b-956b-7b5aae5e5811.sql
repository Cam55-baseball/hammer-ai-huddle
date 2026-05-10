-- Extend foundation system-log retention windows from 30/60/90d -> 365d.
-- Athlete data is NEVER touched by these RPCs.

CREATE OR REPLACE FUNCTION public.cleanup_old_foundation_traces()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.foundation_recommendation_traces
  WHERE created_at < now() - interval '365 days';
END;
$$;

CREATE OR REPLACE FUNCTION public.cleanup_old_foundation_decisions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE d1 int; d2 int; d3 int;
BEGIN
  DELETE FROM public.foundation_fatigue_decisions
    WHERE decided_at < now() - interval '365 days';
  GET DIAGNOSTICS d1 = ROW_COUNT;
  DELETE FROM public.foundation_onboarding_decisions
    WHERE decided_at < now() - interval '365 days';
  GET DIAGNOSTICS d2 = ROW_COUNT;
  DELETE FROM public.foundation_cron_heartbeats
    WHERE ran_at < now() - interval '365 days';
  GET DIAGNOSTICS d3 = ROW_COUNT;
  IF (d1 + d2 + d3) > 0 THEN
    INSERT INTO public.audit_log (user_id, action, table_name, metadata)
    VALUES (
      '00000000-0000-0000-0000-000000000000'::uuid,
      'cleanup_foundation_decisions',
      'foundation_decisions',
      jsonb_build_object('fatigue', d1, 'onboarding', d2, 'heartbeats', d3)
    );
  END IF;
END;
$$;

-- New: prune ops-only telemetry tables that previously grew unbounded.
-- HARD GUARD: open alerts (resolved_at IS NULL) are never touched.
CREATE OR REPLACE FUNCTION public.cleanup_old_foundation_ops_logs()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  d_alerts int := 0;
  d_dispatches int := 0;
  d_replay int := 0;
  cutoff timestamptz := now() - interval '365 days';
BEGIN
  -- Resolved alerts only — open alerts are protected.
  DELETE FROM public.foundation_health_alerts
    WHERE resolved_at IS NOT NULL
      AND resolved_at < cutoff;
  GET DIAGNOSTICS d_alerts = ROW_COUNT;

  DELETE FROM public.foundation_notification_dispatches
    WHERE dispatched_at < cutoff;
  GET DIAGNOSTICS d_dispatches = ROW_COUNT;

  DELETE FROM public.foundation_replay_outcomes
    WHERE ran_at < cutoff;
  GET DIAGNOSTICS d_replay = ROW_COUNT;

  RETURN jsonb_build_object(
    'alerts_deleted', d_alerts,
    'dispatches_deleted', d_dispatches,
    'replay_outcomes_deleted', d_replay,
    'cutoff', cutoff
  );
END;
$$;