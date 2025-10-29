-- Create scout_follows table
CREATE TABLE IF NOT EXISTS scout_follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scout_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(scout_id, player_id)
);

-- Enable RLS
ALTER TABLE scout_follows ENABLE ROW LEVEL SECURITY;

-- RLS Policies for scout_follows
CREATE POLICY "Scouts can view their follows"
ON scout_follows FOR SELECT
USING (auth.uid() = scout_id);

CREATE POLICY "Players can view follows about them"
ON scout_follows FOR SELECT
USING (auth.uid() = player_id);

CREATE POLICY "Scouts can create follows"
ON scout_follows FOR INSERT
WITH CHECK (auth.uid() = scout_id AND has_role(auth.uid(), 'scout'::app_role));

CREATE POLICY "Players can update follow status"
ON scout_follows FOR UPDATE
USING (auth.uid() = player_id)
WITH CHECK (status IN ('accepted', 'rejected'));

CREATE POLICY "Owners can view all follows"
ON scout_follows FOR SELECT
USING (has_role(auth.uid(), 'owner'::app_role));

CREATE POLICY "Owners can manage all follows"
ON scout_follows FOR ALL
USING (has_role(auth.uid(), 'owner'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_scout_follows_updated_at
BEFORE UPDATE ON scout_follows
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();