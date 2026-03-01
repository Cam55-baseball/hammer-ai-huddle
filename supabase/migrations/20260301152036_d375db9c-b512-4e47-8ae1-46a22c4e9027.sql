
-- Add missing columns to verified_stat_profiles
ALTER TABLE public.verified_stat_profiles
  ADD COLUMN IF NOT EXISTS profile_type text,
  ADD COLUMN IF NOT EXISTS admin_notes text,
  ADD COLUMN IF NOT EXISTS removal_requested boolean NOT NULL DEFAULT false;

-- RLS policy: anyone authenticated can view verified+admin_verified stats (public transparency)
CREATE POLICY "Anyone can view verified stats"
  ON public.verified_stat_profiles FOR SELECT
  TO authenticated
  USING (verified = true AND admin_verified = true);

-- Unique constraint to prevent duplicate URL submissions per user
ALTER TABLE public.verified_stat_profiles
  ADD CONSTRAINT unique_user_profile_url UNIQUE (user_id, profile_url);
