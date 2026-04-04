ALTER TABLE public.hydration_logs
  ADD COLUMN IF NOT EXISTS liquid_type text DEFAULT 'water',
  ADD COLUMN IF NOT EXISTS quality_class text DEFAULT 'quality';

ALTER TABLE public.nutrition_food_database
  ADD COLUMN IF NOT EXISTS vitamin_a_mcg numeric,
  ADD COLUMN IF NOT EXISTS vitamin_c_mg numeric,
  ADD COLUMN IF NOT EXISTS vitamin_d_mcg numeric,
  ADD COLUMN IF NOT EXISTS vitamin_e_mg numeric,
  ADD COLUMN IF NOT EXISTS vitamin_k_mcg numeric,
  ADD COLUMN IF NOT EXISTS vitamin_b6_mg numeric,
  ADD COLUMN IF NOT EXISTS vitamin_b12_mcg numeric,
  ADD COLUMN IF NOT EXISTS folate_mcg numeric,
  ADD COLUMN IF NOT EXISTS calcium_mg numeric,
  ADD COLUMN IF NOT EXISTS iron_mg numeric,
  ADD COLUMN IF NOT EXISTS magnesium_mg numeric,
  ADD COLUMN IF NOT EXISTS potassium_mg numeric,
  ADD COLUMN IF NOT EXISTS zinc_mg numeric;