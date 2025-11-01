-- Add session management columns to videos table
ALTER TABLE videos 
  ADD COLUMN IF NOT EXISTS saved_to_library boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS library_title text,
  ADD COLUMN IF NOT EXISTS library_notes text,
  ADD COLUMN IF NOT EXISTS shared_with_scouts boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS session_date timestamp with time zone DEFAULT now();

-- Add indexes for faster library queries
CREATE INDEX IF NOT EXISTS idx_videos_library ON videos(user_id, saved_to_library) 
  WHERE saved_to_library = true;

CREATE INDEX IF NOT EXISTS idx_videos_shared ON videos(user_id, shared_with_scouts) 
  WHERE shared_with_scouts = true;

-- Scouts can view shared videos from players they follow with accepted status
CREATE POLICY "Scouts can view shared videos from followed players"
ON videos FOR SELECT
TO authenticated
USING (
  shared_with_scouts = true
  AND user_id IN (
    SELECT player_id 
    FROM scout_follows 
    WHERE scout_id = auth.uid() 
    AND status = 'accepted'
  )
);

-- Owners can view all videos (additional policy)
CREATE POLICY "Owners can view all library videos"
ON videos FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'owner')
);