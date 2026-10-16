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
    SELECT p.id, p.full_name, coalesce(p.high_school_grad_year, p.graduation_year, p.college_grad_year) AS gy, p.state
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
  ), s AS (
    SELECT m.*,
      CASE WHEN _organization_id IS NULL THEN EXISTS (SELECT 1 FROM public.scout_follows f WHERE f.scout_id=v_uid AND f.player_id=m.id AND f.status='accepted')
           ELSE EXISTS (SELECT 1 FROM public.organization_members om WHERE om.organization_id=_organization_id AND om.user_id=m.id AND om.status='active') END AS connected,
      (SELECT cr.status FROM public.connection_requests cr
         WHERE cr.from_user = v_uid AND cr.subject_user = m.id AND cr.kind = v_kind
           AND (_organization_id IS NULL OR cr.organization_id = _organization_id)
         ORDER BY cr.created_at DESC LIMIT 1) AS last_status
    FROM m
  )
  SELECT s.id, s.full_name, s.gy, s.state, public.is_minor(s.id),
    CASE WHEN s.connected THEN 'accepted' WHEN s.last_status = 'pending' THEN 'pending'
         WHEN s.last_status = 'denied' THEN 'denied' ELSE NULL END
  FROM s;
END $function$;