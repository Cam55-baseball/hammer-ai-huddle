-- Allow authenticated users to upload videos to their own folder
CREATE POLICY "Users can upload their own videos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'videos' 
  AND (storage.foldername(name))[1] = (auth.uid())::text
);

-- Allow users to view their own videos in storage
CREATE POLICY "Users can view their own videos in storage"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'videos' 
  AND (storage.foldername(name))[1] = (auth.uid())::text
);