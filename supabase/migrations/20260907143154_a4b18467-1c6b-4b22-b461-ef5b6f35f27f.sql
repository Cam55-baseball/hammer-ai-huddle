ALTER TABLE public.wk_generation_diagnostics
  ADD COLUMN IF NOT EXISTS recovery_ack jsonb;