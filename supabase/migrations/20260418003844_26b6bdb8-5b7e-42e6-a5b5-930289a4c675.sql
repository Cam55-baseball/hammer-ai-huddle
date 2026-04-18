ALTER TABLE public.hydration_logs
  ADD COLUMN IF NOT EXISTS water_g numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sugar_g numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS glucose_g numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fructose_g numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_carbs_g numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS osmolality_estimate numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS calcium_mg numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ai_estimated boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS nutrition_incomplete boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS confidence numeric DEFAULT 0;