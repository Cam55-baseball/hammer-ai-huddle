-- Add position and experience_level columns to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS position text,
ADD COLUMN IF NOT EXISTS experience_level text;

-- Add a comment to document the experience_level options
COMMENT ON COLUMN public.profiles.experience_level IS 'Experience level: Beginner, Intermediate, Advanced, or Professional';