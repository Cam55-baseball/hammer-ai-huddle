ALTER TABLE public.hie_snapshots
  ADD COLUMN IF NOT EXISTS hitting_doctrine jsonb;

COMMENT ON COLUMN public.hie_snapshots.hitting_doctrine IS
  'Hitting 1-2-3-4 doctrine attribution: { violated_phases, priority_phase, causal_chains, roadmap, confidence, missingness, engine_version, computed_at }. Derived from weakness_clusters in hie-analyze. Replay-safe; never authors organism truth.';