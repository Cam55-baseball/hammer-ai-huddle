ALTER TABLE public.scout_applications ADD COLUMN IF NOT EXISTS organization_name text;
ALTER TABLE public.scout_applications ADD COLUMN IF NOT EXISTS role_title text;