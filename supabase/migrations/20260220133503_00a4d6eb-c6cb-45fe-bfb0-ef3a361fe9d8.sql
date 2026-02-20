ALTER TABLE public.physio_health_profiles
  ADD COLUMN IF NOT EXISTS date_of_birth date,
  ADD COLUMN IF NOT EXISTS biological_sex text,
  ADD COLUMN IF NOT EXISTS contraceptive_use boolean,
  ADD COLUMN IF NOT EXISTS contraceptive_type text;