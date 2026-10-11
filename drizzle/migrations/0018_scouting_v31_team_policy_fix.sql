CREATE OR REPLACE FUNCTION public.is_team_member(_user uuid, _team uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.org_team_members t WHERE t.team_id=_team AND t.user_id=_user AND t.removed_at IS NULL);
$$;
CREATE OR REPLACE FUNCTION public.team_org(_team uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT organization_id FROM public.org_teams WHERE id=_team;
$$;
GRANT EXECUTE ON FUNCTION public.is_team_member(uuid,uuid), public.team_org(uuid) TO authenticated;
DROP POLICY IF EXISTS "Org members read teams" ON public.org_teams;
CREATE POLICY "Org members read teams" ON public.org_teams FOR SELECT TO authenticated
  USING (public.is_org_staff(auth.uid(), organization_id) OR public.is_team_member(auth.uid(), id)
         OR public.user_has_role(auth.uid(),'owner'::app_role) OR public.user_has_role(auth.uid(),'admin'::app_role));
DROP POLICY IF EXISTS "Team members and staff read team members" ON public.org_team_members;
CREATE POLICY "Team members and staff read team members" ON public.org_team_members FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_org_staff(auth.uid(), public.team_org(team_id))
         OR public.user_has_role(auth.uid(),'owner'::app_role) OR public.user_has_role(auth.uid(),'admin'::app_role));