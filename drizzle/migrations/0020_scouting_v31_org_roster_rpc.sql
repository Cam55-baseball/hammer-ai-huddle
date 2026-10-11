CREATE OR REPLACE FUNCTION public.list_org_roster(_organization_id uuid)
RETURNS TABLE(user_id uuid, full_name text, role_in_org text, assigned_coaches uuid[])
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT m.user_id, coalesce(nullif(btrim(p.full_name),''),'Member'), m.role_in_org,
    coalesce(array(SELECT a.coach_user_id FROM public.org_athlete_assignments a
      WHERE a.organization_id=m.organization_id AND a.athlete_user_id=m.user_id AND a.revoked_at IS NULL), '{}')
  FROM public.organization_members m LEFT JOIN public.profiles p ON p.id=m.user_id
  WHERE m.organization_id=_organization_id AND m.status='active' AND m.removed_at IS NULL
    AND public.is_org_admin(auth.uid(), _organization_id)
  ORDER BY m.role_in_org, p.full_name;
$$;
REVOKE ALL ON FUNCTION public.list_org_roster(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_org_roster(uuid) TO authenticated;