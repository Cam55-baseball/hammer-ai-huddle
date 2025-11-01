-- Drop existing foreign key constraints that point to auth.users
ALTER TABLE scout_follows
  DROP CONSTRAINT IF EXISTS scout_follows_scout_id_fkey;

ALTER TABLE scout_follows
  DROP CONSTRAINT IF EXISTS scout_follows_player_id_fkey;

-- Add new foreign key constraints pointing to profiles table
ALTER TABLE scout_follows
  ADD CONSTRAINT scout_follows_scout_id_fkey 
  FOREIGN KEY (scout_id) 
  REFERENCES profiles(id) 
  ON DELETE CASCADE;

ALTER TABLE scout_follows
  ADD CONSTRAINT scout_follows_player_id_fkey 
  FOREIGN KEY (player_id) 
  REFERENCES profiles(id) 
  ON DELETE CASCADE;

-- Add indexes for better join performance
CREATE INDEX IF NOT EXISTS idx_scout_follows_scout_id 
  ON scout_follows(scout_id);

CREATE INDEX IF NOT EXISTS idx_scout_follows_player_id 
  ON scout_follows(player_id);