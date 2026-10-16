CREATE OR REPLACE FUNCTION public.create_solo_team(_name text, _sport text, _age_group text, _level text DEFAULT NULL::text)
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_org uuid; v_team uuid; v_uid uuid := auth.uid(); v_display text;
BEGIN
  IF v_uid IS NULL OR NOT public.user_has_role(v_uid,'coach'::app_role) THEN RAISE EXCEPTION 'Only coach accounts can create a team. Finish coach setup first.'; END IF;
  SELECT id INTO v_org FROM public.organizations WHERE owner_user_id = v_uid AND is_solo LIMIT 1;
  IF v_org IS NULL THEN
    SELECT coalesce(nullif(btrim(full_name),''),'Coach') INTO v_display FROM public.profiles WHERE id = v_uid;
    INSERT INTO public.organizations(name, sport, org_type, owner_user_id, is_solo, verification_status)
      VALUES (coalesce(v_display,'Coach') || '''s teams', _sport, 'team', v_uid, true, 'unsubmitted') RETURNING id INTO v_org;
    INSERT INTO public.organization_members(organization_id, user_id, role_in_org, status) VALUES (v_org, v_uid, 'admin', 'active');
  END IF;
  INSERT INTO public.org_teams(organization_id, name, sport, age_group, level, invite_code, created_by)
    VALUES (v_org, btrim(_name), _sport, _age_group, _level, public._gen_code(), v_uid) RETURNING id INTO v_team;
  INSERT INTO public.org_team_members(team_id, user_id, seat, added_by) VALUES (v_team, v_uid, 'coach', v_uid);
  RETURN v_team;
END $function$;

-- Find athletes to send a connection request to. Uses the same visibility rule as player search:
-- adults, athletes already coached by the caller, or minors whose guardian cleared profile sharing.
-- Test accounts appear only on an exact email match. Returns only what is needed to pick the right person.
CREATE OR REPLACE FUNCTION public.search_athletes_to_connect(_q text, _organization_id uuid DEFAULT NULL)
 RETURNS TABLE(id uuid, full_name text, grad_year integer, state text, under_18 boolean, request_status text)
 LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_uid uuid := auth.uid(); v_q text := lower(btrim(coalesce(_q,''))); v_year int; v_kind text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Sign in first'; END IF;
  IF _organization_id IS NOT NULL THEN
    IF NOT public.is_org_admin(v_uid, _organization_id) THEN RAISE EXCEPTION 'Only organization admins can add athletes'; END IF;
    v_kind := 'org_player';
  ELSE
    IF NOT public.user_has_role(v_uid,'coach'::app_role) THEN RAISE EXCEPTION 'Only coach accounts can send this request'; END IF;
    v_kind := 'coach_player';
  END IF;
  IF length(v_q) < 2 THEN RETURN; END IF;
  IF v_q ~ '^\d{4}$' THEN v_year := v_q::int; END IF;
  RETURN QUERY
  WITH m AS (
    SELECT p.id, p.full_name, coalesce(p.high_school_grad_year, p.graduation_year, p.college_grad_year) AS gy, p.state, p.is_system_account
    FROM public.profiles p LEFT JOIN auth.users u ON u.id = p.id
    WHERE p.id <> v_uid AND p.account_paused_at IS NULL
      AND (lower(u.email) = v_q OR lower(p.contact_email) = v_q
           OR (coalesce(p.is_system_account,false) = false AND (
                p.full_name ILIKE '%' || replace(replace(v_q,'%',''),'_','') || '%'
                OR (v_year IS NOT NULL AND v_year IN (p.high_school_grad_year, p.graduation_year, p.college_grad_year)))))
      AND NOT public.user_has_role(p.id,'coach'::app_role)
      AND NOT public.user_has_role(p.id,'scout'::app_role)
      AND NOT public.is_blocked_pair(v_uid, p.id)
      AND (public.is_minor(p.id) = false OR public.is_coach_of(v_uid, p.id) OR public.resolve_recruiting_scope(p.id,'profile'))
    LIMIT 20
  )
  SELECT m.id, m.full_name, m.gy, m.state, public.is_minor(m.id),
    (SELECT cr.status FROM public.connection_requests cr
       WHERE cr.from_user = v_uid AND cr.subject_user = m.id AND cr.kind = v_kind
         AND (_organization_id IS NULL OR cr.organization_id = _organization_id)
       ORDER BY cr.created_at DESC LIMIT 1)
  FROM m;
END $function$;

REVOKE ALL ON FUNCTION public.search_athletes_to_connect(text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.search_athletes_to_connect(text, uuid) TO authenticated;