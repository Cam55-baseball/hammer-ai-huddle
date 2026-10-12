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
    ELSE RAISE EXCEPTION 'One side must be an approved coach'; END IF;
  ELSIF _kind = 'scout_player' THEN
    IF NOT (public.user_has_role(v_uid,'scout'::app_role) OR public.user_has_role(v_uid,'recruiter'::app_role)) THEN
      RAISE EXCEPTION 'Only approved scouts can send this request'; END IF;
    -- Under 13: only when the parent has turned scouting on; the request goes to the parent's inbox.
    IF public.is_under_13(_to_user) AND NOT public.resolve_recruiting_scope(_to_user, 'profile') THEN
      RAISE EXCEPTION 'Not available' USING ERRCODE = '42501'; END IF;
    v_subject := _to_user;
  ELSIF _kind IN ('org_coach','org_player') THEN
    IF _organization_id IS NULL THEN RAISE EXCEPTION 'Organization required'; END IF;
    IF public.is_org_admin(v_uid, _organization_id) THEN
      v_subject := _to_user;
      IF _kind = 'org_player' AND NOT public.org_can_add_athletes(_organization_id) THEN
        RAISE EXCEPTION 'Your organization must be verified before adding athletes'; END IF;
      IF _kind = 'org_coach' AND NOT public.user_has_role(_to_user,'coach'::app_role) THEN
        RAISE EXCEPTION 'That person is not an approved coach'; END IF;
    ELSE
      v_to_org := true; v_subject := v_uid; _to_user := NULL;
      IF _kind = 'org_coach' AND NOT public.user_has_role(v_uid,'coach'::app_role) THEN RAISE EXCEPTION 'Only approved coaches can join as staff'; END IF;
      IF _kind = 'org_player' AND NOT public.org_can_add_athletes(_organization_id) THEN
        RAISE EXCEPTION 'This organization is not verified yet'; END IF;
    END IF;
  ELSE RAISE EXCEPTION 'Unknown request type'; END IF;
  IF v_subject IS NOT NULL AND public.is_blocked_pair(v_uid, coalesce(_to_user, v_subject)) THEN RAISE EXCEPTION 'Not available'; END IF;
  INSERT INTO public.connection_requests(kind, from_user, to_user, to_org, organization_id, team_id, subject_user, message)
    VALUES (_kind, v_uid, _to_user, v_to_org, _organization_id, _team_id, v_subject, nullif(btrim(_message),''))
    RETURNING id INTO v_id;
  RETURN v_id;
END $function$;