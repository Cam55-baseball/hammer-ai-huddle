-- Add social media fields to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS social_instagram TEXT,
ADD COLUMN IF NOT EXISTS social_twitter TEXT,
ADD COLUMN IF NOT EXISTS social_facebook TEXT,
ADD COLUMN IF NOT EXISTS social_linkedin TEXT,
ADD COLUMN IF NOT EXISTS social_youtube TEXT,
ADD COLUMN IF NOT EXISTS social_website TEXT;

-- Add comments for documentation
COMMENT ON COLUMN profiles.social_instagram IS 'Instagram handle or URL';
COMMENT ON COLUMN profiles.social_twitter IS 'Twitter/X handle or URL';
COMMENT ON COLUMN profiles.social_facebook IS 'Facebook profile URL';
COMMENT ON COLUMN profiles.social_linkedin IS 'LinkedIn profile URL';
COMMENT ON COLUMN profiles.social_youtube IS 'YouTube channel URL';
COMMENT ON COLUMN profiles.social_website IS 'Personal or business website URL';