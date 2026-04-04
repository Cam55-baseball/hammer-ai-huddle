
-- Staging table for AI-generated foods pending validation
CREATE TABLE public.unverified_foods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  calories_per_serving numeric,
  protein_g numeric,
  carbs_g numeric,
  fats_g numeric,
  serving_size text,
  vitamin_a_mcg numeric DEFAULT 0,
  vitamin_c_mg numeric DEFAULT 0,
  vitamin_d_mcg numeric DEFAULT 0,
  vitamin_e_mg numeric DEFAULT 0,
  vitamin_k_mcg numeric DEFAULT 0,
  vitamin_b6_mg numeric DEFAULT 0,
  vitamin_b12_mcg numeric DEFAULT 0,
  folate_mcg numeric DEFAULT 0,
  calcium_mg numeric DEFAULT 0,
  iron_mg numeric DEFAULT 0,
  magnesium_mg numeric DEFAULT 0,
  potassium_mg numeric DEFAULT 0,
  zinc_mg numeric DEFAULT 0,
  confidence_level text DEFAULT 'low',
  source text DEFAULT 'ai',
  created_at timestamptz DEFAULT now(),
  promoted_at timestamptz
);

ALTER TABLE public.unverified_foods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read unverified foods"
  ON public.unverified_foods FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can insert unverified foods"
  ON public.unverified_foods FOR INSERT TO authenticated WITH CHECK (true);

-- Add confidence + source columns to vault_nutrition_logs
ALTER TABLE public.vault_nutrition_logs
  ADD COLUMN IF NOT EXISTS data_confidence text DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS data_source text DEFAULT 'ai';
