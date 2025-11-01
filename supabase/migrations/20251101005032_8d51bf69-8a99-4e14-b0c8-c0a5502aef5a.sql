-- Add credentials field to profiles table for listing qualifications and experience
ALTER TABLE profiles 
  ADD COLUMN credentials text[];

COMMENT ON COLUMN profiles.credentials 
  IS 'List of owner credentials/experience (e.g., playing history, coaching roles, certifications)';