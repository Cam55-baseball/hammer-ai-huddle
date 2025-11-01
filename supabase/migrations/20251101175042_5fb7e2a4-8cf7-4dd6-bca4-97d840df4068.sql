-- Allow scouts to view profiles of players they have accepted follows with
CREATE POLICY "Scouts can view profiles of accepted followed players"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT player_id 
    FROM scout_follows 
    WHERE scout_id = auth.uid() 
    AND status = 'accepted'
  )
);

-- Allow players to view profiles of scouts who follow them
CREATE POLICY "Players can view profiles of scouts who follow them"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT scout_id 
    FROM scout_follows 
    WHERE player_id = auth.uid()
  )
);