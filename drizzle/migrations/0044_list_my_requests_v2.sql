CREATE OR REPLACE FUNCTION public.list_my_requests_v2()
 RETURNS TABLE(id uuid, kind text, incoming boolean, can_answer boolean, for_child boolean, child_name text, other_name text, org_name text, team_name text, status text, message text, created_at timestamp with time zone)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT r.id, r.kind,
    (r.to_user = auth.uid() OR (r.to_org AND public.is_org_admin(auth.uid(), r.organization_id))
      OR (r.to_user IS NOT NULL AND public.is_under_13(r.to_user) AND public.is_authorizing_parent(auth.uid(), r.to_user))) AS incoming,
    (r.status = 'pending' AND (
       (NOT r.to_org AND r.to_user = auth.uid() AND NOT public.is_under_13(auth.uid()))
       OR (NOT r.to_org AND public.is_under_13(r.to_user) AND public.is_authorizing_parent(auth.uid(), r.to_user))
       OR (r.to_org AND public.is_org_admin(auth.uid(), r.organization_id)))) AS can_answer,
    (r.from_user <> auth.uid() AND coalesce(r.to_user,'00000000-0000-0000-0000-000000000000'::uuid) <> auth.uid()
      AND (public.is_authorizing_parent(auth.uid(), r.to_user) OR public.is_authorizing_parent(auth.uid(), r.from_user))) AS for_child,
    (SELECT coalesce(nullif(btrim(c.full_name),''),'your athlete') FROM public.profiles c
       WHERE c.id = CASE WHEN public.is_authorizing_parent(auth.uid(), r.to_user) THEN r.to_user ELSE r.from_user END) AS child_name,
    coalesce(nullif(btrim(p.full_name),''), 'Someone') AS other_name,
    o.name, t.name, r.status, r.message, r.created_at
  FROM public.connection_requests r
  LEFT JOIN public.profiles p ON p.id = CASE
      WHEN r.from_user = auth.uid() THEN coalesce(r.to_user, r.subject_user)
      WHEN public.is_authorizing_parent(auth.uid(), r.from_user) THEN coalesce(r.to_user, r.subject_user)
      ELSE r.from_user END
  LEFT JOIN public.organizations o ON o.id = r.organization_id
  LEFT JOIN public.org_teams t ON t.id = r.team_id
  WHERE auth.uid() IS NOT NULL AND (r.from_user = auth.uid() OR r.to_user = auth.uid()
     OR (r.to_org AND public.is_org_admin(auth.uid(), r.organization_id))
     OR (r.to_user IS NOT NULL AND public.is_authorizing_parent(auth.uid(), r.to_user))
     OR public.is_authorizing_parent(auth.uid(), r.from_user))
  ORDER BY (r.status = 'pending') DESC, r.created_at DESC
  LIMIT 100;
$function$;
REVOKE ALL ON FUNCTION public.list_my_requests_v2() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_my_requests_v2() TO authenticated, service_role;