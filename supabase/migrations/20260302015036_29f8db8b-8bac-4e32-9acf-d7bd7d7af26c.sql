
-- Add bidirectional linking columns to scout_follows
ALTER TABLE public.scout_follows
  ADD COLUMN IF NOT EXISTS initiated_by text DEFAULT 'coach',
  ADD COLUMN IF NOT EXISTS confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS relationship_type text DEFAULT 'follow';

-- Security definer function to check linked coach relationship
CREATE OR REPLACE FUNCTION public.is_linked_coach(p_coach_id uuid, p_player_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.scout_follows
    WHERE scout_id = p_coach_id
      AND player_id = p_player_id
      AND status = 'accepted'
      AND relationship_type = 'linked'
  )
$$;

-- Players can create link requests (player-initiated)
CREATE POLICY "Players can create link requests"
ON public.scout_follows FOR INSERT
WITH CHECK (
  auth.uid() = player_id
  AND initiated_by = 'player'
);

-- Players can view their own relationships
CREATE POLICY "Players can view their coach relationships"
ON public.scout_follows FOR SELECT
USING (auth.uid() = player_id);

-- Linked coaches can view their linked players' sessions
CREATE POLICY "Linked coaches can view player sessions"
ON public.performance_sessions FOR SELECT
USING (
  auth.uid() = user_id
  OR public.is_linked_coach(auth.uid(), user_id)
  OR public.has_role(auth.uid(), 'owner')
);

-- Only linked coaches can submit grade overrides
CREATE POLICY "Linked coaches can insert overrides"
ON public.coach_grade_overrides FOR INSERT
WITH CHECK (
  public.is_linked_coach(auth.uid(), (
    SELECT user_id FROM public.performance_sessions WHERE id = session_id
  ))
);
