CREATE OR REPLACE FUNCTION public.guard_follow_transitions()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE me uuid := auth.uid();
BEGIN
  -- respond_connection_request has already checked the receiver; it marks its own writes.
  IF me IS NULL OR public.has_role(me, 'owner'::app_role) OR public.has_role(me, 'admin'::app_role)
     OR current_setting('app.connection_rpc', true) = 'on' THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' THEN
    IF NEW.status <> 'pending' THEN RAISE EXCEPTION 'follow_must_start_pending' USING ERRCODE = '42501'; END IF;
    IF me = NEW.player_id AND NEW.initiated_by <> 'player' THEN RAISE EXCEPTION 'follow_initiator_mismatch' USING ERRCODE = '42501'; END IF;
    IF me = NEW.scout_id AND NEW.initiated_by = 'player' THEN RAISE EXCEPTION 'follow_initiator_mismatch' USING ERRCODE = '42501'; END IF;
    NEW.confirmed_at := NULL;
    RETURN NEW;
  END IF;
  IF NEW.scout_id <> OLD.scout_id OR NEW.player_id <> OLD.player_id OR NEW.initiated_by <> OLD.initiated_by THEN
    RAISE EXCEPTION 'follow_identity_locked' USING ERRCODE = '42501';
  END IF;
  IF NEW.status = 'accepted' AND OLD.status IS DISTINCT FROM 'accepted' THEN
    IF (OLD.initiated_by = 'player' AND me <> OLD.scout_id) OR (OLD.initiated_by <> 'player' AND me <> OLD.player_id) THEN
      RAISE EXCEPTION 'follow_accept_by_other_side_only' USING ERRCODE = '42501';
    END IF;
  END IF;
  IF NEW.status = 'pending' AND OLD.status <> 'pending' THEN
    RAISE EXCEPTION 'follow_cannot_reopen' USING ERRCODE = '42501';
  END IF;
  IF NEW.relationship_type IS DISTINCT FROM OLD.relationship_type AND OLD.status = 'accepted' AND me <> OLD.player_id THEN
    RAISE EXCEPTION 'follow_type_change_player_only' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $function$;

CREATE OR REPLACE FUNCTION public.respond_connection_request(_id uuid, _accept boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); r public.connection_requests; v_player uuid; v_other uuid; v_can boolean;
BEGIN
  SELECT * INTO r FROM public.connection_requests WHERE id = _id FOR UPDATE;
  IF r.id IS NULL OR r.status <> 'pending' THEN RAISE EXCEPTION 'Request not found'; END IF;
  v_can := (NOT r.to_org AND (r.to_user = v_uid OR (public.is_under_13(r.to_user) AND public.is_authorizing_parent(v_uid, r.to_user))))
        OR (r.to_org AND public.is_org_admin(v_uid, r.organization_id));
  IF NOT v_can THEN RAISE EXCEPTION 'Only the receiver can answer this request'; END IF;
  IF NOT r.to_org AND r.to_user = v_uid AND public.is_under_13(v_uid) THEN RAISE EXCEPTION 'A parent must answer this request'; END IF;
  IF NOT _accept THEN
    UPDATE public.connection_requests SET status='denied', responded_at=now(), responded_by=v_uid WHERE id=_id;
    RETURN jsonb_build_object('ok', true, 'status', 'denied');
  END IF;
  PERFORM set_config('app.connection_rpc', 'on', true);
  IF r.kind IN ('coach_player','scout_player') THEN
    v_player := CASE WHEN r.subject_user = r.from_user THEN r.from_user ELSE r.to_user END;
    v_other := CASE WHEN v_player = r.from_user THEN r.to_user ELSE r.from_user END;
    INSERT INTO public.scout_follows(scout_id, player_id, status, initiated_by, relationship_type, confirmed_at)
      VALUES (v_other, v_player, 'accepted', CASE WHEN r.from_user = v_player THEN 'player' ELSE 'scout' END,
              CASE WHEN r.kind = 'coach_player' THEN 'linked' ELSE 'follow' END, now())
      ON CONFLICT (scout_id, player_id) DO UPDATE SET status='accepted', confirmed_at=now(), updated_at=now(),
        relationship_type = CASE WHEN r.kind='coach_player' THEN 'linked' ELSE public.scout_follows.relationship_type END;
  ELSIF r.kind = 'org_coach' THEN
    IF NOT EXISTS (SELECT 1 FROM public.organization_members WHERE organization_id=r.organization_id AND user_id=r.subject_user) THEN
      INSERT INTO public.organization_members(organization_id, user_id, role_in_org, status) VALUES (r.organization_id, r.subject_user, 'coach', 'active');
    ELSE
      UPDATE public.organization_members SET status='active', removed_at=NULL, role_in_org = CASE WHEN role_in_org='admin' THEN 'admin' ELSE 'coach' END
        WHERE organization_id=r.organization_id AND user_id=r.subject_user;
    END IF;
  ELSIF r.kind = 'org_player' THEN
    IF NOT public.org_can_add_athletes(r.organization_id) THEN RAISE EXCEPTION 'This organization is not verified yet'; END IF;
    IF NOT EXISTS (SELECT 1 FROM public.organization_members WHERE organization_id=r.organization_id AND user_id=r.subject_user) THEN
      INSERT INTO public.organization_members(organization_id, user_id, role_in_org, status) VALUES (r.organization_id, r.subject_user, 'player', 'active');
    ELSE
      UPDATE public.organization_members SET status='active', removed_at=NULL WHERE organization_id=r.organization_id AND user_id=r.subject_user;
    END IF;
    IF r.team_id IS NOT NULL THEN
      INSERT INTO public.org_team_members(team_id, user_id, seat, added_by) VALUES (r.team_id, r.subject_user, 'player', v_uid)
        ON CONFLICT (team_id, user_id) DO UPDATE SET removed_at = NULL;
    END IF;
  END IF;
  UPDATE public.connection_requests SET status='accepted', responded_at=now(), responded_by=v_uid WHERE id=_id;
  RETURN jsonb_build_object('ok', true, 'status', 'accepted');
END $$;

CREATE OR REPLACE FUNCTION public.join_by_invite_code(_code text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_org uuid; v_team uuid; v_name text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Sign in first'; END IF;
  SELECT t.organization_id, t.id, t.name INTO v_org, v_team, v_name FROM public.org_teams t
    WHERE t.invite_code = upper(btrim(_code)) AND t.archived_at IS NULL;
  IF v_org IS NULL THEN
    SELECT o.id, o.name INTO v_org, v_name FROM public.organizations o
      WHERE o.invite_code = upper(btrim(_code)) AND (o.invite_expires_at IS NULL OR o.invite_expires_at > now());
  END IF;
  IF v_org IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'not_found'); END IF;
  IF NOT public.org_can_add_athletes(v_org) THEN RETURN jsonb_build_object('ok', false, 'reason', 'not_verified'); END IF;
  IF public.is_under_13(v_uid) THEN RETURN jsonb_build_object('ok', false, 'reason', 'parent_required'); END IF;
  IF NOT EXISTS (SELECT 1 FROM public.organization_members WHERE organization_id=v_org AND user_id=v_uid) THEN
    INSERT INTO public.organization_members(organization_id, user_id, role_in_org, status) VALUES (v_org, v_uid, 'player', 'active');
  ELSE
    UPDATE public.organization_members SET status='active', removed_at=NULL WHERE organization_id=v_org AND user_id=v_uid AND role_in_org='player';
  END IF;
  IF v_team IS NOT NULL THEN
    INSERT INTO public.org_team_members(team_id, user_id, seat, added_by) VALUES (v_team, v_uid, 'player', v_uid)
      ON CONFLICT (team_id, user_id) DO UPDATE SET removed_at = NULL;
  END IF;
  RETURN jsonb_build_object('ok', true, 'organization_id', v_org, 'team_id', v_team, 'name', v_name);
END $$;