CREATE OR REPLACE FUNCTION public.is_linked_coach(p_coach_id uuid, p_player_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.scout_follows
    WHERE scout_id = p_coach_id
      AND player_id = p_player_id
      AND status = 'accepted'
      AND relationship_type IN ('linked', 'follow')
  )
$$;