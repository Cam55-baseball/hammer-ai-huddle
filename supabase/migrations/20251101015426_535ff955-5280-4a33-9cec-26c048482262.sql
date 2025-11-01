-- Make the videos storage bucket public so videos can be viewed and replayed
UPDATE storage.buckets 
SET public = true 
WHERE name = 'videos';