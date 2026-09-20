ALTER TABLE public.wk_movement_catalog
  ADD COLUMN IF NOT EXISTS ub_tier text,
  ADD COLUMN IF NOT EXISTS plane text,
  ADD COLUMN IF NOT EXISTS exposure_channel text,
  ADD COLUMN IF NOT EXISTS contacts_per_rep numeric,
  ADD COLUMN IF NOT EXISTS pitcher_flags text[] NOT NULL DEFAULT '{}'::text[];

ALTER TABLE public.wk_movement_catalog
  ADD CONSTRAINT wk_movement_catalog_ub_tier_check
  CHECK (ub_tier IS NULL OR ub_tier = ANY (ARRAY['U1'::text,'U2'::text,'U3'::text]));

ALTER TABLE public.wk_movement_catalog
  ADD CONSTRAINT wk_movement_catalog_plane_check
  CHECK (plane IS NULL OR plane = ANY (ARRAY['push'::text,'pull_h'::text,'pull_v'::text,'overhead'::text,'rotation'::text]));

ALTER TABLE public.wk_movement_catalog
  ADD CONSTRAINT wk_movement_catalog_contacts_per_rep_check
  CHECK (contacts_per_rep IS NULL OR (contacts_per_rep >= 0 AND contacts_per_rep <= 100));