-- Drop existing restrictive policies for scout application files
DROP POLICY IF EXISTS "Owners can view all letters" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own letters" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own letters" ON storage.objects;
DROP POLICY IF EXISTS "Owners can view all scout videos" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own scout videos" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own scout videos" ON storage.objects;

-- Create new public read policies for scout application files
CREATE POLICY "Public can view scout letters"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'scout-letters');

CREATE POLICY "Public can view scout videos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'scout-videos');

-- Maintain upload restrictions (authenticated users only, folder-based)
CREATE POLICY "Users can upload scout letters"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'scout-letters' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can upload scout videos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'scout-videos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);