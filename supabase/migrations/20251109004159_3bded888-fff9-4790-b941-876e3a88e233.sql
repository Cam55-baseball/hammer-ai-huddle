-- Add analysis_public column to videos table
ALTER TABLE videos 
ADD COLUMN analysis_public boolean DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN videos.analysis_public IS 'Controls whether AI analysis is visible to scouts/coaches when video is shared';

-- Update existing shared videos to have analysis_public = true (maintain current behavior)
UPDATE videos 
SET analysis_public = true 
WHERE shared_with_scouts = true;