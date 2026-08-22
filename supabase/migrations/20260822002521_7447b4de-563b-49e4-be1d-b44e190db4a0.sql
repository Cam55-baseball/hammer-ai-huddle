ALTER TABLE public.wk_generation_diagnostics
  ADD COLUMN IF NOT EXISTS training_methods jsonb;