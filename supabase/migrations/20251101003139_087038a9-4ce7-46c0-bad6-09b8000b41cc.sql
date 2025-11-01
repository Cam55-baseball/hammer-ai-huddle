-- Add email field for public contact
ALTER TABLE profiles 
  ADD COLUMN contact_email text;

-- Add TikTok social media field
ALTER TABLE profiles
  ADD COLUMN social_tiktok text;

-- Add multiple website fields (support up to 5 websites)
ALTER TABLE profiles
  ADD COLUMN social_website_2 text,
  ADD COLUMN social_website_3 text,
  ADD COLUMN social_website_4 text,
  ADD COLUMN social_website_5 text;

-- Add comments for clarity
COMMENT ON COLUMN profiles.contact_email IS 'Public-facing contact email for the owner';
COMMENT ON COLUMN profiles.social_tiktok IS 'TikTok profile URL or username';
COMMENT ON COLUMN profiles.social_website_2 IS 'Additional website URL 2';
COMMENT ON COLUMN profiles.social_website_3 IS 'Additional website URL 3';
COMMENT ON COLUMN profiles.social_website_4 IS 'Additional website URL 4';
COMMENT ON COLUMN profiles.social_website_5 IS 'Additional website URL 5';