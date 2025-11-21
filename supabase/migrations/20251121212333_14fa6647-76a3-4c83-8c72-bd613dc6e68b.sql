-- Add thumbnail optimization columns to videos table
ALTER TABLE videos 
ADD COLUMN IF NOT EXISTS thumbnail_webp_url TEXT,
ADD COLUMN IF NOT EXISTS thumbnail_sizes JSONB DEFAULT '{"small": "", "medium": "", "large": ""}'::jsonb,
ADD COLUMN IF NOT EXISTS blurhash TEXT;

COMMENT ON COLUMN videos.thumbnail_webp_url IS 'WebP version of thumbnail for better compression';
COMMENT ON COLUMN videos.thumbnail_sizes IS 'JSON object with URLs for different thumbnail sizes (small, medium, large)';
COMMENT ON COLUMN videos.blurhash IS 'Blurhash string for ultra-fast placeholder loading';