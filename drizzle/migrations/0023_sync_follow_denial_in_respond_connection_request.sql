CREATE OR REPLACE FUNCTION public.respond_connection_request(_id uuid, _accept boolean)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
    -- Keep the legacy follow row in sync so the old panel never shows a stale pending request.
    IF r.kind IN ('coach_player','scout_player') THEN
      UPDATE public.scout_follows SET status='rejected', updated_at=now()
        WHERE status='pending'
          AND ((scout_id = r.from_user AND player_id = r.to_user) OR (scout_id = r.to_user AND player_id = r.from_user));
    END IF;
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