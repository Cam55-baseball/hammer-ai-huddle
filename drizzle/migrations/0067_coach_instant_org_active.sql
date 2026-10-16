-- Owner 2026-10-16: no approvals except scouts.
CREATE OR REPLACE FUNCTION public.claim_coach_status()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_uid uuid := auth.uid(); v_dob date;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Sign in first'; END IF;
  SELECT date_of_birth INTO v_dob FROM public.profiles WHERE id = v_uid;
  IF v_dob IS NULL OR v_dob > (current_date - interval '18 years')::date THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'adult_only');
  END IF;
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id=v_uid AND role='coach'::app_role) THEN
    UPDATE public.user_roles SET status='active' WHERE user_id=v_uid AND role='coach'::app_role;
  ELSE
    INSERT INTO public.user_roles(user_id, role, status) VALUES (v_uid, 'coach'::app_role, 'active');
  END IF;
  UPDATE public.scout_applications SET status='approved', updated_at=now()
    WHERE user_id=v_uid AND applying_as='coach' AND status='pending';
  RETURN jsonb_build_object('ok', true);
END $$;
REVOKE ALL ON FUNCTION public.claim_coach_status() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.claim_coach_status() TO authenticated;

-- Auto-approve pending adult coach applications.
INSERT INTO public.user_roles(user_id, role, status)
SELECT DISTINCT a.user_id, 'coach'::app_role, 'active' FROM public.scout_applications a
JOIN public.profiles p ON p.id=a.user_id
WHERE a.applying_as='coach' AND a.status='pending' AND p.date_of_birth <= (current_date - interval '18 years')::date
  AND NOT EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id=a.user_id AND r.role='coach'::app_role);
UPDATE public.user_roles r SET status='active' FROM public.scout_applications a JOIN public.profiles p ON p.id=a.user_id
WHERE r.user_id=a.user_id AND r.role='coach'::app_role AND a.applying_as='coach' AND a.status='pending'
  AND p.date_of_birth <= (current_date - interval '18 years')::date;
UPDATE public.scout_applications a SET status='approved', updated_at=now() FROM public.profiles p
WHERE p.id=a.user_id AND a.applying_as='coach' AND a.status='pending'
  AND p.date_of_birth <= (current_date - interval '18 years')::date;

-- Organizations are active right away (no owner review).
CREATE OR REPLACE FUNCTION public.org_can_add_athletes(_org uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = _org);
$$;
UPDATE public.organizations SET verification_status='verified', verified=true, reviewed_at=now(),
  review_note='Auto-activated: owner removed organization approval (2026-10-16)'
WHERE verification_status IN ('pending','unsubmitted') AND NOT is_solo;

-- Plain wording: full coach status is enough (no owner approval).
CREATE OR REPLACE FUNCTION public.send_connection_request(_kind text, _to_user uuid, _organization_id uuid DEFAULT NULL::uuid, _team_id uuid DEFAULT NULL::uuid, _message text DEFAULT NULL::text)
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_uid uuid := auth.uid(); v_id uuid; v_to_org boolean := false; v_subject uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Sign in first'; END IF;
  IF _to_user = v_uid THEN RAISE EXCEPTION 'You cannot send a request to yourself'; END IF;
  IF _kind = 'coach_player' THEN
    IF public.user_has_role(v_uid,'coach'::app_role) THEN v_subject := _to_user;
    ELSIF public.user_has_role(_to_user,'coach'::app_role) THEN v_subject := v_uid;
    ELSE RAISE EXCEPTION 'One side must be a coach'; END IF;
  ELSIF _kind = 'scout_player' THEN
    IF NOT (public.user_has_role(v_uid,'scout'::app_role) OR public.user_has_role(v_uid,'recruiter'::app_role)) THEN
      RAISE EXCEPTION 'Only approved scouts can send this request'; END IF;
    IF public.is_under_13(_to_user) AND NOT public.resolve_recruiting_scope(_to_user, 'profile') THEN
      RAISE EXCEPTION 'Not available' USING ERRCODE = '42501'; END IF;
    v_subject := _to_user;
  ELSIF _kind IN ('org_coach','org_player') THEN
    IF _organization_id IS NULL THEN RAISE EXCEPTION 'Organization required'; END IF;
    IF public.is_org_admin(v_uid, _organization_id) THEN
      v_subject := _to_user;
      IF _kind = 'org_player' AND NOT public.org_can_add_athletes(_organization_id) THEN
        RAISE EXCEPTION 'Organization not found'; END IF;
      IF _kind = 'org_coach' AND NOT public.user_has_role(_to_user,'coach'::app_role) THEN
        RAISE EXCEPTION 'That person does not have a coach account'; END IF;
    ELSE
      v_to_org := true; v_subject := v_uid; _to_user := NULL;
      IF _kind = 'org_coach' AND NOT public.user_has_role(v_uid,'coach'::app_role) THEN RAISE EXCEPTION 'Only coach accounts can join as staff'; END IF;
      IF _kind = 'org_player' AND NOT public.org_can_add_athletes(_organization_id) THEN
        RAISE EXCEPTION 'Organization not found'; END IF;
    END IF;
  ELSE RAISE EXCEPTION 'Unknown request type'; END IF;
  IF v_subject IS NOT NULL AND public.is_blocked_pair(v_uid, coalesce(_to_user, v_subject)) THEN RAISE EXCEPTION 'Not available'; END IF;
  INSERT INTO public.connection_requests(kind, from_user, to_user, to_org, organization_id, team_id, subject_user, message)
    VALUES (_kind, v_uid, _to_user, v_to_org, _organization_id, _team_id, v_subject, nullif(btrim(_message),''))
    RETURNING id INTO v_id;
  RETURN v_id;
END $function$;