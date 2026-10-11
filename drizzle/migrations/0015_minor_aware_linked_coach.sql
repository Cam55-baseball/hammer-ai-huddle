INSERT INTO public._snapshot_security_20261011(kind, name, detail)
SELECT 'function', 'public.is_linked_coach', pg_get_functiondef('public.is_linked_coach(uuid,uuid)'::regprocedure)
UNION ALL
SELECT 'policy', schemaname||'.'||tablename||'.'||policyname, coalesce(cmd,'')||' | '||coalesce(qual,'')
FROM pg_policies WHERE schemaname='public' AND tablename IN ('session_videos','videos') AND policyname IN ('Coaches can view athlete videos','Scouts can view shared videos from followed players');

-- Legacy "any accepted follow" helper now applies the same rules as media:
-- real staff role, no blocks, never under-13, and for 13-17 either a linked coach
-- (coach role) or parent-authorized recruiting consent for metrics.
CREATE OR REPLACE FUNCTION public.is_linked_coach(p_coach_id uuid, p_player_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.scout_follows sf
    WHERE sf.scout_id = p_coach_id AND sf.player_id = p_player_id
      AND sf.status = 'accepted' AND sf.relationship_type IN ('linked', 'follow')
  )
  AND (public.user_has_role(p_coach_id, 'coach'::app_role) OR public.user_has_role(p_coach_id, 'scout'::app_role)
       OR public.user_has_role(p_coach_id, 'recruiter'::app_role))
  AND NOT public.is_under_13(p_player_id)
  AND NOT EXISTS (SELECT 1 FROM public.user_blocks b
                  WHERE (b.blocker_id = p_coach_id AND b.blocked_id = p_player_id)
                     OR (b.blocker_id = p_player_id AND b.blocked_id = p_coach_id))
  AND (public.is_minor(p_player_id) = false
       OR public.is_coach_of(p_coach_id, p_player_id)
       OR public.resolve_recruiting_scope(p_player_id, 'metrics'));
$$;

DROP POLICY IF EXISTS "Coaches can view athlete videos" ON public.session_videos;
CREATE POLICY "Coaches can view athlete videos" ON public.session_videos
  FOR SELECT TO authenticated
  USING (auth.uid() <> user_id AND public.can_view_athlete_media(auth.uid(), user_id));

DROP POLICY IF EXISTS "Scouts can view shared videos from followed players" ON public.videos;
CREATE POLICY "Scouts can view shared videos from followed players" ON public.videos
  FOR SELECT TO authenticated
  USING (shared_with_scouts = true AND public.can_view_athlete_media(auth.uid(), user_id));