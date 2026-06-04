ALTER TABLE public.performance_sessions
  ADD COLUMN IF NOT EXISTS pie_v2_signals jsonb;

ALTER TABLE public.athlete_foundation_state
  ADD COLUMN IF NOT EXISTS pie_v2_caution_state jsonb;

COMMENT ON COLUMN public.performance_sessions.pie_v2_signals IS
  'PIE V2 session aggregate projection cache. Canonical truth = asb_events (pitching.v2.*). engine_version pinned to pie-v2.0.0.';

COMMENT ON COLUMN public.athlete_foundation_state.pie_v2_caution_state IS
  'PIE V2 RR-6 advisory state projection cache. Advisory only; never gates execution. Canonical truth = asb_events.';