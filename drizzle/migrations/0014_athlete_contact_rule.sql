CREATE OR REPLACE FUNCTION public.can_view_athlete_contact(_athlete uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT auth.uid() IS NOT NULL AND (
    auth.uid() = _athlete
    OR public.has_role(auth.uid(), 'owner'::app_role)
    OR public.is_authorizing_parent(auth.uid(), _athlete)
    OR (
      NOT public.is_under_13(_athlete)
      AND NOT EXISTS (SELECT 1 FROM public.user_blocks b
                      WHERE (b.blocker_id = auth.uid() AND b.blocked_id = _athlete)
                         OR (b.blocker_id = _athlete AND b.blocked_id = auth.uid()))
      AND (public.user_has_role(auth.uid(), 'coach'::app_role) OR public.user_has_role(auth.uid(), 'scout'::app_role)
           OR public.user_has_role(auth.uid(), 'recruiter'::app_role))
      AND (
        public.resolve_recruiting_scope(_athlete, 'contact')
        OR (public.is_minor(_athlete) = false AND public.is_coach_of(auth.uid(), _athlete))
      )
    )
  );
$$;
REVOKE ALL ON FUNCTION public.can_view_athlete_contact(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.can_view_athlete_contact(uuid) TO authenticated;