-- Make scout storage buckets public so files can be viewed
UPDATE storage.buckets 
SET public = true 
WHERE id IN ('scout-letters', 'scout-videos');