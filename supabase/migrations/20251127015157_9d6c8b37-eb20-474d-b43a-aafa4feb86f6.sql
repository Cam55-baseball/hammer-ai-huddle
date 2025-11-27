-- Add annotator_type column to distinguish scout annotations from player self-annotations
ALTER TABLE video_annotations 
  ADD COLUMN IF NOT EXISTS annotator_type TEXT DEFAULT 'scout' CHECK (annotator_type IN ('scout', 'player'));

-- Make scout_id nullable for player self-annotations
ALTER TABLE video_annotations 
  ALTER COLUMN scout_id DROP NOT NULL;

-- Add RLS policy for players to insert annotations on their own videos
CREATE POLICY "Players can insert annotations on their own videos"
  ON video_annotations FOR INSERT
  WITH CHECK (
    player_id = auth.uid() AND 
    annotator_type = 'player' AND
    scout_id IS NULL
  );

-- Add RLS policy for players to view their own self-annotations
CREATE POLICY "Players can view their own self-annotations"
  ON video_annotations FOR SELECT
  USING (
    player_id = auth.uid() AND 
    annotator_type = 'player'
  );

-- Add RLS policy for players to delete their own self-annotations
CREATE POLICY "Players can delete their own self-annotations"
  ON video_annotations FOR DELETE
  USING (
    player_id = auth.uid() AND 
    annotator_type = 'player' AND
    scout_id IS NULL
  );