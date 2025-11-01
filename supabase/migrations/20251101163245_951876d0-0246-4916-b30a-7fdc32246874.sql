-- Allow users to view profiles of scouts who have sent them follow requests
CREATE POLICY "Users can view profiles of scouts with follow requests"
ON profiles
FOR SELECT
USING (
  id IN (
    SELECT scout_id 
    FROM scout_follows 
    WHERE player_id = auth.uid()
  )
);