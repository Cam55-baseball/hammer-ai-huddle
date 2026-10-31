ALTER TABLE public.owner_drills
  ADD COLUMN IF NOT EXISTS pitch_mound_type text CHECK (pitch_mound_type IS NULL OR pitch_mound_type IN ('full_bullpen','light_mound','shortbox','flat_ground','circle','shortbox_circle')),
  ADD COLUMN IF NOT EXISTS pitch_distance_fraction numeric CHECK (pitch_distance_fraction IS NULL OR (pitch_distance_fraction > 0 AND pitch_distance_fraction <= 1)),
  ADD COLUMN IF NOT EXISTS pitch_distance_feet numeric CHECK (pitch_distance_feet IS NULL OR (pitch_distance_feet > 0 AND pitch_distance_feet <= 400)),
  ADD COLUMN IF NOT EXISTS pitch_intensity text CHECK (pitch_intensity IS NULL OR pitch_intensity IN ('catch_light','medium','full')),
  ADD COLUMN IF NOT EXISTS pitch_count integer CHECK (pitch_count IS NULL OR (pitch_count >= 0 AND pitch_count <= 150)),
  ADD COLUMN IF NOT EXISTS pitch_types text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS pitch_purposes text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS pitch_role_fit text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS arm_tax_level text CHECK (arm_tax_level IS NULL OR arm_tax_level IN ('low','medium','high'));