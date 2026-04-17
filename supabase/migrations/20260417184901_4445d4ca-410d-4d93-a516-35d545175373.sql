ALTER TABLE public.hydration_logs
  ADD COLUMN IF NOT EXISTS glucose_g numeric,
  ADD COLUMN IF NOT EXISTS fructose_g numeric,
  ADD COLUMN IF NOT EXISTS osmolality_estimate numeric,
  ADD COLUMN IF NOT EXISTS absorption_score numeric;