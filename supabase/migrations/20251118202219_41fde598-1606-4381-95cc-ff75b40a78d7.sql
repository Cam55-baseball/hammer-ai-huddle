-- Allow authenticated users to update their own video files (including thumbnails)
DROP POLICY IF EXISTS "Users can update their own videos in storage" ON storage.objects;

CREATE POLICY "Users can update their own videos in storage"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'videos'
  AND (storage.foldername(name))[1] = (auth.uid())::text
)
WITH CHECK (
  bucket_id = 'videos'
  AND (storage.foldername(name))[1] = (auth.uid())::text
);
