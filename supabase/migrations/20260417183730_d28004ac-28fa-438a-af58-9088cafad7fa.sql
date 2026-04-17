-- 1) Extend hydration_logs with nutrition + computed profile
ALTER TABLE public.hydration_logs
  ADD COLUMN IF NOT EXISTS water_g numeric,
  ADD COLUMN IF NOT EXISTS sodium_mg numeric,
  ADD COLUMN IF NOT EXISTS potassium_mg numeric,
  ADD COLUMN IF NOT EXISTS magnesium_mg numeric,
  ADD COLUMN IF NOT EXISTS sugar_g numeric,
  ADD COLUMN IF NOT EXISTS total_carbs_g numeric,
  ADD COLUMN IF NOT EXISTS hydration_profile jsonb;

-- 2) Beverage reference DB
CREATE TABLE IF NOT EXISTS public.hydration_beverage_database (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  liquid_type text NOT NULL UNIQUE,
  display_name text NOT NULL,
  water_g_per_oz numeric NOT NULL DEFAULT 0,
  sodium_mg_per_oz numeric NOT NULL DEFAULT 0,
  potassium_mg_per_oz numeric NOT NULL DEFAULT 0,
  magnesium_mg_per_oz numeric NOT NULL DEFAULT 0,
  sugar_g_per_oz numeric NOT NULL DEFAULT 0,
  total_carbs_g_per_oz numeric NOT NULL DEFAULT 0,
  source text NOT NULL DEFAULT 'manual',
  usda_fdc_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.hydration_beverage_database ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read the reference data
CREATE POLICY "Beverage DB readable by authenticated"
ON public.hydration_beverage_database
FOR SELECT
TO authenticated
USING (true);

-- Only owners can manage
CREATE POLICY "Owners can insert beverage DB"
ON public.hydration_beverage_database
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'owner'::app_role));

CREATE POLICY "Owners can update beverage DB"
ON public.hydration_beverage_database
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'owner'::app_role));

CREATE POLICY "Owners can delete beverage DB"
ON public.hydration_beverage_database
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'owner'::app_role));

CREATE TRIGGER update_hydration_beverage_database_updated_at
BEFORE UPDATE ON public.hydration_beverage_database
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();