-- Add new columns to profiles table for enhanced bios
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS first_name text,
  ADD COLUMN IF NOT EXISTS last_name text,
  ADD COLUMN IF NOT EXISTS height text,
  ADD COLUMN IF NOT EXISTS weight text,
  ADD COLUMN IF NOT EXISTS state text,
  ADD COLUMN IF NOT EXISTS graduation_year integer,
  ADD COLUMN IF NOT EXISTS team_affiliation text,
  ADD COLUMN IF NOT EXISTS years_affiliated integer;

-- Add comments for clarity
COMMENT ON COLUMN public.profiles.team_affiliation IS 'Travel team, High School, College, or Pro Team affiliation';
COMMENT ON COLUMN public.profiles.years_affiliated IS 'Number of years affiliated with team (for coaches/scouts)';

-- Create avatars storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- RLS Policy for uploading avatars
CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- RLS Policy for updating avatars
CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- RLS Policy for deleting avatars
CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- RLS Policy for viewing all avatars (public bucket)
CREATE POLICY "Anyone can view avatars"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');