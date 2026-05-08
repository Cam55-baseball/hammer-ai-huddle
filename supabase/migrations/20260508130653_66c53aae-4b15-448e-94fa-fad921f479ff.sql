ALTER TABLE public.hie_snapshots
  ADD COLUMN IF NOT EXISTS training_readiness_score smallint;