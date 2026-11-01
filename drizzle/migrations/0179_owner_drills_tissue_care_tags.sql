ALTER TABLE public.owner_drills
  ADD COLUMN IF NOT EXISTS care_areas text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS care_types text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS care_contexts text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS care_roles text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS care_intensity text;
COMMENT ON COLUMN public.owner_drills.care_areas IS 'Tissue care body areas (owner Nov 1 matching). Empty on legacy rows = full body.';