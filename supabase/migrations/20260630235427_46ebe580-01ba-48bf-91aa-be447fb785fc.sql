ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS training_age_years numeric,
  ADD COLUMN IF NOT EXISTS is_pro_prospect boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS one_rm jsonb DEFAULT '{}'::jsonb;