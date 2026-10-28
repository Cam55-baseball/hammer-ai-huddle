ALTER TABLE public.owner_drills
  ADD COLUMN IF NOT EXISTS conditioning_kind text,
  ADD COLUMN IF NOT EXISTS work_seconds integer,
  ADD COLUMN IF NOT EXISTS rest_seconds integer,
  ADD COLUMN IF NOT EXISTS rounds integer,
  ADD COLUMN IF NOT EXISTS distance_feet integer,
  ADD COLUMN IF NOT EXISTS bases_per_rep integer,
  ADD COLUMN IF NOT EXISTS base_distance_feet integer;
ALTER TABLE public.owner_drills
  ADD CONSTRAINT owner_drills_conditioning_kind_chk CHECK (conditioning_kind IS NULL OR conditioning_kind IN ('run','base_route')),
  ADD CONSTRAINT owner_drills_conditioning_ranges_chk CHECK (
    (work_seconds IS NULL OR work_seconds BETWEEN 1 AND 600)
    AND (rest_seconds IS NULL OR rest_seconds BETWEEN 0 AND 600)
    AND (rounds IS NULL OR rounds BETWEEN 1 AND 20)
    AND (distance_feet IS NULL OR distance_feet BETWEEN 1 AND 1200)
    AND (bases_per_rep IS NULL OR bases_per_rep BETWEEN 1 AND 4)
    AND (base_distance_feet IS NULL OR base_distance_feet IN (60,90)));