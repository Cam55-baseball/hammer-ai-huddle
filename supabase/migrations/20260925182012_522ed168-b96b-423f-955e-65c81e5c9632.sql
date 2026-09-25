-- Snapshot of prior policy text is recorded in docs/asb/recruiting-consent-enforcement-2026-09-25.md
DROP POLICY IF EXISTS "Scouts can view athletes who granted recruiting consent" ON public.profiles;
CREATE POLICY "Scouts can view athletes who granted recruiting consent" ON public.profiles
FOR SELECT TO authenticated
USING (public.user_has_role(auth.uid(), 'scout'::app_role)
  AND public.resolve_recruiting_scope(id, 'profile')
  AND NOT public.is_blocked_pair(auth.uid(), id));

DROP POLICY IF EXISTS "Scouts can view profiles of accepted followed players" ON public.profiles;
CREATE POLICY "Scouts can view profiles of accepted followed players" ON public.profiles
FOR SELECT TO authenticated
USING (id IN (SELECT sf.player_id FROM public.scout_follows sf WHERE sf.scout_id = auth.uid() AND sf.status = 'accepted')
  AND NOT public.is_blocked_pair(auth.uid(), id)
  AND (public.is_minor(id) = false OR public.resolve_recruiting_scope(id, 'profile')));

DROP POLICY IF EXISTS "Scouts can view shared videos from followed players" ON public.videos;
CREATE POLICY "Scouts can view shared videos from followed players" ON public.videos
FOR SELECT TO authenticated
USING (shared_with_scouts = true
  AND user_id IN (SELECT sf.player_id FROM public.scout_follows sf WHERE sf.scout_id = auth.uid() AND sf.status = 'accepted')
  AND (public.is_minor(user_id) = false OR public.resolve_recruiting_scope(user_id, 'video')));

DROP POLICY IF EXISTS "Consented scouts read athlete fault signals" ON public.wk_fault_signals;
CREATE POLICY "Consented scouts read athlete fault signals" ON public.wk_fault_signals
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'scout'::app_role)
  AND public.resolve_recruiting_scope(user_id, 'metrics'));

-- Non-identifying status for scouts: returns only whether a followed minor is waiting on guardian consent.
CREATE OR REPLACE FUNCTION public.followed_player_consent_status(_player_id uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE
    WHEN NOT EXISTS (SELECT 1 FROM public.scout_follows sf WHERE sf.scout_id = auth.uid() AND sf.player_id = _player_id AND sf.status='accepted') THEN 'not_following'
    WHEN public.is_minor(_player_id) = false THEN 'visible'
    WHEN public.resolve_recruiting_scope(_player_id, 'profile') THEN 'visible'
    ELSE 'waiting_on_guardian' END
$$;
REVOKE ALL ON FUNCTION public.followed_player_consent_status(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.followed_player_consent_status(uuid) TO authenticated;