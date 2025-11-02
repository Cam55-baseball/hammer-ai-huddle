-- Allow scouts and coaches to view all player profiles (for recruiting/discovery)
CREATE POLICY "Scouts and coaches can view all player profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  -- Allow scouts/coaches to view profiles of users who have the 'player' role
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = profiles.id 
    AND user_roles.role = 'player'
  )
  AND EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role IN ('scout', 'coach')
  )
);