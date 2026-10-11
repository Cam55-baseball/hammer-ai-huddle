-- Snapshot touched definitions
INSERT INTO public._snapshot_security_20261011(kind, name, detail)
SELECT 'function','public.is_coach_of (pre v3.1)', pg_get_functiondef('public.is_coach_of(uuid,uuid)'::regprocedure)
UNION ALL
SELECT 'policy', tablename||'.'||policyname, coalesce(cmd,'')||' | '||coalesce(qual,'')||' | '||coalesce(with_check,'')
FROM pg_policies WHERE schemaname='public' AND tablename IN ('organizations','organization_members');

-- 1. Organization verification fields
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS website text,
  ADD COLUMN IF NOT EXISTS official_email text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS admin_role_title text,
  ADD COLUMN IF NOT EXISTS proof_path text,
  ADD COLUMN IF NOT EXISTS verification_status text NOT NULL DEFAULT 'unsubmitted',
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS email_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS email_code_hash text,
  ADD COLUMN IF NOT EXISTS email_code_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS is_solo boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS review_note text;
UPDATE public.organizations SET verification_status = CASE WHEN verified THEN 'verified' ELSE 'unsubmitted' END;
ALTER TABLE public.organizations ADD CONSTRAINT organizations_verification_status_chk
  CHECK (verification_status IN ('unsubmitted','pending','verified','rejected'));

-- Only owner/admin can verify; org owners may only move unsubmitted/rejected -> pending.
CREATE OR REPLACE FUNCTION public.guard_org_verification()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.user_has_role(auth.uid(),'owner'::app_role) OR public.user_has_role(auth.uid(),'admin'::app_role)
     OR auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.verified := false; NEW.verified_by := NULL; NEW.email_verified_at := NULL;
    NEW.email_code_hash := NULL; NEW.reviewed_at := NULL; NEW.review_note := NULL;
    IF NEW.verification_status NOT IN ('unsubmitted','pending') THEN NEW.verification_status := 'unsubmitted'; END IF;
    RETURN NEW;
  END IF;
  IF NEW.verified IS DISTINCT FROM OLD.verified OR NEW.verified_by IS DISTINCT FROM OLD.verified_by
     OR NEW.email_verified_at IS DISTINCT FROM OLD.email_verified_at
     OR NEW.email_code_hash IS DISTINCT FROM OLD.email_code_hash
     OR NEW.email_code_expires_at IS DISTINCT FROM OLD.email_code_expires_at
     OR NEW.reviewed_at IS DISTINCT FROM OLD.reviewed_at OR NEW.review_note IS DISTINCT FROM OLD.review_note
     OR NEW.is_solo IS DISTINCT FROM OLD.is_solo OR NEW.owner_user_id IS DISTINCT FROM OLD.owner_user_id THEN
    RAISE EXCEPTION 'Only the app owner can change verification';
  END IF;
  IF NEW.verification_status IS DISTINCT FROM OLD.verification_status
     AND NOT (OLD.verification_status IN ('unsubmitted','rejected') AND NEW.verification_status = 'pending') THEN
    RAISE EXCEPTION 'Only the app owner can change verification';
  END IF;
  -- Changing identity details after verification sends it back for review.
  IF OLD.verification_status = 'verified' AND (NEW.name IS DISTINCT FROM OLD.name OR NEW.official_email IS DISTINCT FROM OLD.official_email) THEN
    NEW.verification_status := 'pending'; NEW.verified := false; NEW.email_verified_at := NULL;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_guard_org_verification ON public.organizations;
CREATE TRIGGER trg_guard_org_verification BEFORE INSERT OR UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.guard_org_verification();

-- 2. Org staff helpers
CREATE OR REPLACE FUNCTION public.is_org_admin(_user uuid, _org uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _user IS NOT NULL AND (
    EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = _org AND o.owner_user_id = _user)
    OR EXISTS (SELECT 1 FROM public.organization_members m WHERE m.organization_id = _org AND m.user_id = _user
               AND m.status = 'active' AND m.role_in_org = 'admin'));
$$;
CREATE OR REPLACE FUNCTION public.is_org_staff(_user uuid, _org uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_org_admin(_user,_org) OR EXISTS (SELECT 1 FROM public.organization_members m
    WHERE m.organization_id = _org AND m.user_id = _user AND m.status = 'active' AND m.role_in_org IN ('admin','coach'));
$$;
CREATE OR REPLACE FUNCTION public.org_can_add_athletes(_org uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = _org AND (o.verification_status = 'verified' OR o.is_solo));
$$;

-- 3. Teams
CREATE TABLE public.org_teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 60),
  sport text,
  age_group text,
  level text,
  invite_code text UNIQUE,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz
);
GRANT SELECT, INSERT, UPDATE ON public.org_teams TO authenticated;
GRANT ALL ON public.org_teams TO service_role;
ALTER TABLE public.org_teams ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.org_team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.org_teams(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  seat text NOT NULL DEFAULT 'player' CHECK (seat IN ('player','coach')),
  added_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  removed_at timestamptz,
  UNIQUE (team_id, user_id)
);
GRANT SELECT ON public.org_team_members TO authenticated;
GRANT ALL ON public.org_team_members TO service_role;
ALTER TABLE public.org_team_members ENABLE ROW LEVEL SECURITY;

-- 4. Coach ↔ athlete assignments inside an organization (coaches see ONLY assigned athletes)
CREATE TABLE public.org_athlete_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  coach_user_id uuid NOT NULL,
  athlete_user_id uuid NOT NULL,
  assigned_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz
);
CREATE UNIQUE INDEX org_athlete_assignments_active_uq ON public.org_athlete_assignments(organization_id, coach_user_id, athlete_user_id) WHERE revoked_at IS NULL;
GRANT SELECT ON public.org_athlete_assignments TO authenticated;
GRANT ALL ON public.org_athlete_assignments TO service_role;
ALTER TABLE public.org_athlete_assignments ENABLE ROW LEVEL SECURITY;

-- 5. ONE request system
CREATE TABLE public.connection_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('org_coach','coach_player','org_player','scout_player')),
  from_user uuid NOT NULL,
  to_user uuid,            -- person receiving (null when an organization receives)
  to_org boolean NOT NULL DEFAULT false,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  team_id uuid REFERENCES public.org_teams(id) ON DELETE SET NULL,
  subject_user uuid NOT NULL, -- the coach/player/scout being paired
  message text CHECK (message IS NULL OR length(message) <= 300),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','denied','cancelled','revoked')),
  created_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz,
  responded_by uuid
);
CREATE UNIQUE INDEX connection_requests_pending_uq ON public.connection_requests(kind, from_user, coalesce(to_user,'00000000-0000-0000-0000-000000000000'::uuid), coalesce(organization_id,'00000000-0000-0000-0000-000000000000'::uuid)) WHERE status = 'pending';
GRANT SELECT ON public.connection_requests TO authenticated;
GRANT ALL ON public.connection_requests TO service_role;
ALTER TABLE public.connection_requests ENABLE ROW LEVEL SECURITY;

-- 6. Head coach (one per player; grants no extra data)
CREATE TABLE public.athlete_head_coach (
  athlete_user_id uuid PRIMARY KEY,
  coach_user_id uuid NOT NULL,
  set_by uuid NOT NULL,
  set_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.athlete_head_coach TO authenticated;
GRANT ALL ON public.athlete_head_coach TO service_role;
ALTER TABLE public.athlete_head_coach ENABLE ROW LEVEL SECURITY;

-- 7. Coach-of: org path now requires an org admin seat or an explicit assignment.
CREATE OR REPLACE FUNCTION public.is_coach_of(_coach uuid, _athlete uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  select _coach is not null and _athlete is not null and _coach <> _athlete and (
      exists (select 1 from public.athlete_mpi_settings a where a.user_id = _athlete
              and (_coach = a.primary_coach_id or _coach = any(coalesce(a.secondary_coach_ids,'{}'::uuid[]))))
      or (
        public.user_has_role(_coach, 'coach'::app_role)
        and exists (
          select 1 from public.organization_members om2
          where om2.user_id = _athlete and om2.status = 'active' and om2.role_in_org = 'player'
            and ( public.is_org_admin(_coach, om2.organization_id)
                  or exists (select 1 from public.org_athlete_assignments x
                             where x.organization_id = om2.organization_id and x.coach_user_id = _coach
                               and x.athlete_user_id = _athlete and x.revoked_at is null
                               and public.is_org_staff(_coach, om2.organization_id)))))
      or (
        exists (select 1 from public.scout_follows sf where sf.scout_id = _coach and sf.player_id = _athlete
                and sf.status = 'accepted' and sf.relationship_type = 'linked')
        and (public.is_minor(_athlete) = false or public.user_has_role(_coach, 'coach'::app_role))));
$$;

-- 8. Policies
DROP POLICY IF EXISTS "All authenticated can select orgs" ON public.organizations;
CREATE POLICY "Org members, staff and app admins read orgs" ON public.organizations FOR SELECT TO authenticated
  USING (owner_user_id = auth.uid() OR public.is_org_staff(auth.uid(), id)
         OR EXISTS (SELECT 1 FROM public.organization_members m WHERE m.organization_id = id AND m.user_id = auth.uid() AND m.status = 'active')
         OR public.user_has_role(auth.uid(),'owner'::app_role) OR public.user_has_role(auth.uid(),'admin'::app_role));

-- Self-join is now only through join_by_invite_code (code + verified/solo check).
DROP POLICY IF EXISTS "Players can join as player only" ON public.organization_members;
DROP POLICY IF EXISTS "Org owners can manage members" ON public.organization_members;
CREATE POLICY "Org admins add staff only" ON public.organization_members FOR INSERT TO authenticated
  WITH CHECK ((public.is_org_admin(auth.uid(), organization_id) AND role_in_org IN ('admin','coach') AND status = 'pending')
              OR public.user_has_role(auth.uid(),'admin'::app_role) OR public.user_has_role(auth.uid(),'owner'::app_role));
DROP POLICY IF EXISTS "Members can select own org members" ON public.organization_members;
CREATE POLICY "Members and org staff read members" ON public.organization_members FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_org_staff(auth.uid(), organization_id)
         OR public.user_has_role(auth.uid(),'admin'::app_role) OR public.user_has_role(auth.uid(),'owner'::app_role));
CREATE POLICY "Members can leave" ON public.organization_members FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id AND status = 'removed');

CREATE POLICY "Org members read teams" ON public.org_teams FOR SELECT TO authenticated
  USING (public.is_org_staff(auth.uid(), organization_id)
         OR EXISTS (SELECT 1 FROM public.org_team_members t WHERE t.team_id = id AND t.user_id = auth.uid() AND t.removed_at IS NULL)
         OR public.user_has_role(auth.uid(),'owner'::app_role) OR public.user_has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Org admins create teams" ON public.org_teams FOR INSERT TO authenticated
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id) AND created_by = auth.uid());
CREATE POLICY "Org admins edit teams" ON public.org_teams FOR UPDATE TO authenticated
  USING (public.is_org_admin(auth.uid(), organization_id)) WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Team members and staff read team members" ON public.org_team_members FOR SELECT TO authenticated
  USING (user_id = auth.uid()
         OR EXISTS (SELECT 1 FROM public.org_teams t WHERE t.id = team_id AND public.is_org_staff(auth.uid(), t.organization_id))
         OR public.user_has_role(auth.uid(),'owner'::app_role) OR public.user_has_role(auth.uid(),'admin'::app_role));

CREATE POLICY "Involved people read assignments" ON public.org_athlete_assignments FOR SELECT TO authenticated
  USING (coach_user_id = auth.uid() OR athlete_user_id = auth.uid() OR public.is_org_admin(auth.uid(), organization_id)
         OR public.user_has_role(auth.uid(),'owner'::app_role));

CREATE POLICY "Involved people read requests" ON public.connection_requests FOR SELECT TO authenticated
  USING (from_user = auth.uid() OR to_user = auth.uid() OR subject_user = auth.uid()
         OR (organization_id IS NOT NULL AND public.is_org_admin(auth.uid(), organization_id))
         OR public.is_authorizing_parent(auth.uid(), subject_user)
         OR (to_user IS NOT NULL AND public.is_authorizing_parent(auth.uid(), to_user))
         OR public.user_has_role(auth.uid(),'owner'::app_role));

CREATE POLICY "Athlete, coach and parents read head coach" ON public.athlete_head_coach FOR SELECT TO authenticated
  USING (athlete_user_id = auth.uid() OR coach_user_id = auth.uid() OR public.is_coach_of(auth.uid(), athlete_user_id)
         OR public.is_authorizing_parent(auth.uid(), athlete_user_id) OR public.user_has_role(auth.uid(),'owner'::app_role));

-- 9. Server actions (the only write paths)
CREATE OR REPLACE FUNCTION public._gen_code() RETURNS text LANGUAGE sql VOLATILE AS $$
  SELECT string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 1 + floor(random()*32)::int, 1), '') FROM generate_series(1,6);
$$;

CREATE OR REPLACE FUNCTION public.create_solo_team(_name text, _sport text, _age_group text, _level text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_org uuid; v_team uuid; v_uid uuid := auth.uid(); v_display text;
BEGIN
  IF v_uid IS NULL OR NOT public.user_has_role(v_uid,'coach'::app_role) THEN RAISE EXCEPTION 'Only approved coaches can create a team'; END IF;
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
  INSERT INTO public.organization_members(organization_id, user_id, role_in_org, status)
    VALUES (v_org, v_uid, 'player', 'active')
    ON CONFLICT DO NOTHING;
  UPDATE public.organization_members SET status='active', removed_at=NULL WHERE organization_id=v_org AND user_id=v_uid AND role_in_org='player';
  IF v_team IS NOT NULL THEN
    INSERT INTO public.org_team_members(team_id, user_id, seat, added_by) VALUES (v_team, v_uid, 'player', v_uid)
      ON CONFLICT (team_id, user_id) DO UPDATE SET removed_at = NULL;
  END IF;
  RETURN jsonb_build_object('ok', true, 'organization_id', v_org, 'team_id', v_team, 'name', v_name);
END $$;

CREATE OR REPLACE FUNCTION public.send_connection_request(_kind text, _to_user uuid, _organization_id uuid DEFAULT NULL, _team_id uuid DEFAULT NULL, _message text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_id uuid; v_to_org boolean := false; v_subject uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Sign in first'; END IF;
  IF _to_user = v_uid THEN RAISE EXCEPTION 'You cannot send a request to yourself'; END IF;
  IF _kind = 'coach_player' THEN
    -- coach -> player, or player -> coach
    IF public.user_has_role(v_uid,'coach'::app_role) THEN v_subject := _to_user;
    ELSIF public.user_has_role(_to_user,'coach'::app_role) THEN v_subject := v_uid;
    ELSE RAISE EXCEPTION 'One side must be an approved coach'; END IF;
  ELSIF _kind = 'scout_player' THEN
    IF NOT (public.user_has_role(v_uid,'scout'::app_role) OR public.user_has_role(v_uid,'recruiter'::app_role)) THEN
      RAISE EXCEPTION 'Only approved scouts can send this request'; END IF;
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
      -- a coach or player asking to join; the organization receives
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
END $$;

CREATE OR REPLACE FUNCTION public.respond_connection_request(_id uuid, _accept boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); r public.connection_requests; v_player uuid; v_other uuid; v_can boolean;
BEGIN
  SELECT * INTO r FROM public.connection_requests WHERE id = _id FOR UPDATE;
  IF r.id IS NULL OR r.status <> 'pending' THEN RAISE EXCEPTION 'Request not found'; END IF;
  -- Receiver: the person, the organization's admins, or the authorizing parent of an under-13 receiver.
  v_can := (NOT r.to_org AND (r.to_user = v_uid OR (public.is_under_13(r.to_user) AND public.is_authorizing_parent(v_uid, r.to_user))))
        OR (r.to_org AND public.is_org_admin(v_uid, r.organization_id));
  IF NOT v_can THEN RAISE EXCEPTION 'Only the receiver can answer this request'; END IF;
  -- An under-13 player's own account cannot accept; the parent decides.
  IF NOT r.to_org AND r.to_user = v_uid AND public.is_under_13(v_uid) THEN RAISE EXCEPTION 'A parent must answer this request'; END IF;
  IF NOT _accept THEN
    UPDATE public.connection_requests SET status='denied', responded_at=now(), responded_by=v_uid WHERE id=_id;
    RETURN jsonb_build_object('ok', true, 'status', 'denied');
  END IF;
  IF r.kind IN ('coach_player','scout_player') THEN
    v_player := CASE WHEN public.user_has_role(r.from_user,'coach'::app_role) OR public.user_has_role(r.from_user,'scout'::app_role) OR public.user_has_role(r.from_user,'recruiter'::app_role) THEN r.to_user ELSE r.from_user END;
    v_other := CASE WHEN v_player = r.from_user THEN r.to_user ELSE r.from_user END;
    INSERT INTO public.scout_follows(scout_id, player_id, status, initiated_by, relationship_type, confirmed_at)
      VALUES (v_other, v_player, 'accepted', CASE WHEN r.from_user = v_player THEN 'player' ELSE 'scout' END,
              CASE WHEN r.kind = 'coach_player' THEN 'linked' ELSE 'follow' END, now())
      ON CONFLICT (scout_id, player_id) DO UPDATE SET status='accepted', confirmed_at=now(),
        relationship_type = CASE WHEN r.kind='coach_player' THEN 'linked' ELSE public.scout_follows.relationship_type END;
  ELSIF r.kind = 'org_coach' THEN
    INSERT INTO public.organization_members(organization_id, user_id, role_in_org, status)
      VALUES (r.organization_id, r.subject_user, 'coach', 'active') ON CONFLICT DO NOTHING;
    UPDATE public.organization_members SET status='active', removed_at=NULL, role_in_org = CASE WHEN role_in_org='admin' THEN 'admin' ELSE 'coach' END
      WHERE organization_id=r.organization_id AND user_id=r.subject_user;
  ELSIF r.kind = 'org_player' THEN
    IF NOT public.org_can_add_athletes(r.organization_id) THEN RAISE EXCEPTION 'This organization is not verified yet'; END IF;
    INSERT INTO public.organization_members(organization_id, user_id, role_in_org, status)
      VALUES (r.organization_id, r.subject_user, 'player', 'active') ON CONFLICT DO NOTHING;
    UPDATE public.organization_members SET status='active', removed_at=NULL WHERE organization_id=r.organization_id AND user_id=r.subject_user;
    IF r.team_id IS NOT NULL THEN
      INSERT INTO public.org_team_members(team_id, user_id, seat, added_by) VALUES (r.team_id, r.subject_user, 'player', v_uid)
        ON CONFLICT (team_id, user_id) DO UPDATE SET removed_at = NULL;
    END IF;
  END IF;
  UPDATE public.connection_requests SET status='accepted', responded_at=now(), responded_by=v_uid WHERE id=_id;
  RETURN jsonb_build_object('ok', true, 'status', 'accepted');
END $$;

CREATE OR REPLACE FUNCTION public.cancel_connection_request(_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.connection_requests SET status='cancelled', responded_at=now(), responded_by=auth.uid()
  WHERE id=_id AND from_user=auth.uid() AND status='pending';
$$;

-- Revocation: either side (or the authorizing parent) ends a pairing; access stops at once.
CREATE OR REPLACE FUNCTION public.end_connection(_other uuid, _organization_id uuid DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Sign in first'; END IF;
  IF _organization_id IS NOT NULL THEN
    IF public.is_org_admin(v_uid,_organization_id) THEN
      UPDATE public.organization_members SET status='removed', removed_at=now() WHERE organization_id=_organization_id AND user_id=_other AND user_id <> (SELECT owner_user_id FROM public.organizations WHERE id=_organization_id);
      UPDATE public.org_athlete_assignments SET revoked_at=now() WHERE organization_id=_organization_id AND (athlete_user_id=_other OR coach_user_id=_other) AND revoked_at IS NULL;
      UPDATE public.org_team_members tm SET removed_at=now() FROM public.org_teams t WHERE t.id=tm.team_id AND t.organization_id=_organization_id AND tm.user_id=_other;
    ELSE
      UPDATE public.organization_members SET status='removed', removed_at=now() WHERE organization_id=_organization_id AND user_id=v_uid;
      UPDATE public.org_athlete_assignments SET revoked_at=now() WHERE organization_id=_organization_id AND (athlete_user_id=v_uid OR coach_user_id=v_uid) AND revoked_at IS NULL;
      UPDATE public.org_team_members tm SET removed_at=now() FROM public.org_teams t WHERE t.id=tm.team_id AND t.organization_id=_organization_id AND tm.user_id=v_uid;
    END IF;
    RETURN;
  END IF;
  UPDATE public.scout_follows SET status='rejected', updated_at=now()
    WHERE status='accepted' AND ((scout_id=v_uid AND player_id=_other) OR (scout_id=_other AND player_id=v_uid)
       OR (public.is_authorizing_parent(v_uid, player_id) AND scout_id=_other));
  DELETE FROM public.athlete_head_coach WHERE coach_user_id=_other AND (athlete_user_id=v_uid OR public.is_authorizing_parent(v_uid, athlete_user_id));
  DELETE FROM public.athlete_head_coach WHERE athlete_user_id=_other AND coach_user_id=v_uid;
END $$;

CREATE OR REPLACE FUNCTION public.assign_athletes(_organization_id uuid, _coach uuid, _athletes uuid[], _assign boolean DEFAULT true)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n integer := 0; a uuid;
BEGIN
  IF NOT public.is_org_admin(auth.uid(), _organization_id) THEN RAISE EXCEPTION 'Only organization admins can assign athletes'; END IF;
  IF NOT public.is_org_staff(_coach, _organization_id) THEN RAISE EXCEPTION 'That coach is not on your staff'; END IF;
  FOREACH a IN ARRAY _athletes LOOP
    IF NOT EXISTS (SELECT 1 FROM public.organization_members WHERE organization_id=_organization_id AND user_id=a AND role_in_org='player' AND status='active') THEN CONTINUE; END IF;
    IF _assign THEN
      INSERT INTO public.org_athlete_assignments(organization_id, coach_user_id, athlete_user_id, assigned_by)
        VALUES (_organization_id, _coach, a, auth.uid()) ON CONFLICT DO NOTHING;
    ELSE
      UPDATE public.org_athlete_assignments SET revoked_at = now() WHERE organization_id=_organization_id AND coach_user_id=_coach AND athlete_user_id=a AND revoked_at IS NULL;
    END IF;
    n := n + 1;
  END LOOP;
  RETURN n;
END $$;

CREATE OR REPLACE FUNCTION public.set_head_coach(_athlete uuid, _coach uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT (auth.uid() = _athlete AND NOT public.is_under_13(_athlete)) AND NOT public.is_authorizing_parent(auth.uid(), _athlete) THEN
    RAISE EXCEPTION 'Only the player or their parent can choose the head coach'; END IF;
  IF _coach IS NULL THEN DELETE FROM public.athlete_head_coach WHERE athlete_user_id=_athlete; RETURN; END IF;
  IF NOT public.is_coach_of(_coach, _athlete) THEN RAISE EXCEPTION 'Pick one of your connected coaches'; END IF;
  INSERT INTO public.athlete_head_coach(athlete_user_id, coach_user_id, set_by) VALUES (_athlete, _coach, auth.uid())
    ON CONFLICT (athlete_user_id) DO UPDATE SET coach_user_id=EXCLUDED.coach_user_id, set_by=EXCLUDED.set_by, set_at=now();
END $$;

CREATE OR REPLACE FUNCTION public.submit_org_for_verification(_organization_id uuid, _address text, _website text, _official_email text, _phone text, _admin_role_title text, _proof_path text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_org_admin(auth.uid(), _organization_id) THEN RAISE EXCEPTION 'Only organization admins can submit'; END IF;
  IF coalesce(btrim(_official_email),'') !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN RAISE EXCEPTION 'Enter a valid official email'; END IF;
  UPDATE public.organizations SET address=_address, website=_website, official_email=lower(btrim(_official_email)), phone=_phone,
    admin_role_title=_admin_role_title, proof_path=_proof_path, verification_status='pending', submitted_at=now(), verified=false
  WHERE id=_organization_id AND verification_status IN ('unsubmitted','rejected','pending');
END $$;

CREATE OR REPLACE FUNCTION public.review_org_verification(_organization_id uuid, _approve boolean, _note text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT (public.user_has_role(auth.uid(),'owner'::app_role) OR public.user_has_role(auth.uid(),'admin'::app_role)) THEN RAISE EXCEPTION 'Owner only'; END IF;
  IF _approve AND NOT EXISTS (SELECT 1 FROM public.organizations WHERE id=_organization_id AND email_verified_at IS NOT NULL) THEN
    RAISE EXCEPTION 'The official email code has not been confirmed yet'; END IF;
  UPDATE public.organizations SET verification_status = CASE WHEN _approve THEN 'verified' ELSE 'rejected' END,
    verified=_approve, verified_by=auth.uid(), reviewed_at=now(), review_note=_note WHERE id=_organization_id;
END $$;

CREATE OR REPLACE FUNCTION public.get_org_invite_code(_organization_id uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT invite_code FROM public.organizations WHERE id=_organization_id AND public.is_org_admin(auth.uid(), _organization_id);
$$;

REVOKE ALL ON FUNCTION public.create_solo_team(text,text,text,text), public.join_by_invite_code(text),
  public.send_connection_request(text,uuid,uuid,uuid,text), public.respond_connection_request(uuid,boolean),
  public.cancel_connection_request(uuid), public.end_connection(uuid,uuid), public.assign_athletes(uuid,uuid,uuid[],boolean),
  public.set_head_coach(uuid,uuid), public.submit_org_for_verification(uuid,text,text,text,text,text,text),
  public.review_org_verification(uuid,boolean,text), public.get_org_invite_code(uuid), public._gen_code() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_solo_team(text,text,text,text), public.join_by_invite_code(text),
  public.send_connection_request(text,uuid,uuid,uuid,text), public.respond_connection_request(uuid,boolean),
  public.cancel_connection_request(uuid), public.end_connection(uuid,uuid), public.assign_athletes(uuid,uuid,uuid[],boolean),
  public.set_head_coach(uuid,uuid), public.submit_org_for_verification(uuid,text,text,text,text,text,text),
  public.review_org_verification(uuid,boolean,text), public.get_org_invite_code(uuid),
  public.is_org_admin(uuid,uuid), public.is_org_staff(uuid,uuid), public.org_can_add_athletes(uuid) TO authenticated;