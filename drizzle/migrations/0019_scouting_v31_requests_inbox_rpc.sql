CREATE OR REPLACE FUNCTION public.list_my_requests()
RETURNS TABLE(id uuid, kind text, incoming boolean, can_answer boolean, other_name text, org_name text, team_name text,
              status text, message text, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT r.id, r.kind,
    (r.to_user = auth.uid() OR (r.to_org AND public.is_org_admin(auth.uid(), r.organization_id))
      OR (r.to_user IS NOT NULL AND public.is_under_13(r.to_user) AND public.is_authorizing_parent(auth.uid(), r.to_user))) AS incoming,
    (r.status = 'pending' AND (
       (NOT r.to_org AND r.to_user = auth.uid() AND NOT public.is_under_13(auth.uid()))
       OR (NOT r.to_org AND public.is_under_13(r.to_user) AND public.is_authorizing_parent(auth.uid(), r.to_user))
       OR (r.to_org AND public.is_org_admin(auth.uid(), r.organization_id)))) AS can_answer,
    coalesce(nullif(btrim(p.full_name),''), 'Someone') AS other_name,
    o.name, t.name, r.status, r.message, r.created_at
  FROM public.connection_requests r
  LEFT JOIN public.profiles p ON p.id = CASE WHEN r.from_user = auth.uid() THEN coalesce(r.to_user, r.subject_user) ELSE r.from_user END
  LEFT JOIN public.organizations o ON o.id = r.organization_id
  LEFT JOIN public.org_teams t ON t.id = r.team_id
  WHERE auth.uid() IS NOT NULL AND (r.from_user = auth.uid() OR r.to_user = auth.uid()
     OR (r.to_org AND public.is_org_admin(auth.uid(), r.organization_id))
     OR (r.to_user IS NOT NULL AND public.is_authorizing_parent(auth.uid(), r.to_user)))
  ORDER BY (r.status = 'pending') DESC, r.created_at DESC
  LIMIT 100;
$$;

CREATE OR REPLACE FUNCTION public.list_my_coaches(_athlete uuid DEFAULT NULL)
RETURNS TABLE(coach_id uuid, coach_name text, via text, is_head boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH me AS (SELECT coalesce(_athlete, auth.uid()) AS a),
  ok AS (SELECT (SELECT a FROM me) = auth.uid() OR public.is_authorizing_parent(auth.uid(), (SELECT a FROM me)) AS v),
  c AS (
    SELECT sf.scout_id AS coach_id, 'Direct' AS via FROM public.scout_follows sf, me
      WHERE sf.player_id = me.a AND sf.status='accepted' AND sf.relationship_type='linked'
    UNION
    SELECT x.coach_user_id, o.name FROM public.org_athlete_assignments x JOIN public.organizations o ON o.id=x.organization_id, me
      WHERE x.athlete_user_id = me.a AND x.revoked_at IS NULL
  )
  SELECT c.coach_id, coalesce(nullif(btrim(p.full_name),''),'Coach'), min(c.via),
         EXISTS (SELECT 1 FROM public.athlete_head_coach h, me WHERE h.athlete_user_id=me.a AND h.coach_user_id=c.coach_id)
  FROM c JOIN public.profiles p ON p.id=c.coach_id, ok
  WHERE ok.v AND public.is_coach_of(c.coach_id, (SELECT a FROM me))
  GROUP BY c.coach_id, p.full_name;
$$;

CREATE OR REPLACE FUNCTION public.list_org_pending_verification()
RETURNS TABLE(id uuid, name text, org_type text, address text, website text, official_email text, phone text,
              admin_role_title text, proof_path text, email_confirmed boolean, submitted_at timestamptz, owner_name text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT o.id, o.name, o.org_type, o.address, o.website, o.official_email, o.phone, o.admin_role_title, o.proof_path,
         o.email_verified_at IS NOT NULL, o.submitted_at, p.full_name
  FROM public.organizations o LEFT JOIN public.profiles p ON p.id=o.owner_user_id
  WHERE o.verification_status='pending'
    AND (public.user_has_role(auth.uid(),'owner'::app_role) OR public.user_has_role(auth.uid(),'admin'::app_role))
  ORDER BY o.submitted_at;
$$;

REVOKE ALL ON FUNCTION public.list_my_requests(), public.list_my_coaches(uuid), public.list_org_pending_verification() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_my_requests(), public.list_my_coaches(uuid), public.list_org_pending_verification() TO authenticated;