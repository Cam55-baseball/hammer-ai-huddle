-- Snapshots (owner rule: snapshot before change)
CREATE TABLE IF NOT EXISTS public._snapshot_security_20261011 AS
SELECT 'bucket'::text AS kind, b.id::text AS name, b.public::text AS detail FROM storage.buckets b
UNION ALL
SELECT 'policy', schemaname||'.'||tablename||'.'||policyname, coalesce(cmd,'')||' | '||coalesce(qual,'')||' | '||coalesce(with_check,'')
FROM pg_policies WHERE (schemaname='storage' AND tablename='objects')
   OR (schemaname='public' AND tablename IN ('user_roles','scout_applications','organization_members','scout_follows','folder_coach_permissions'))
UNION ALL
SELECT 'function', 'public.is_coach_of', pg_get_functiondef('public.is_coach_of(uuid,uuid)'::regprocedure);
ALTER TABLE public._snapshot_security_20261011 ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public._snapshot_security_20261011 TO service_role;

-- 1. Media access decision (one rule for every athlete media path)
CREATE OR REPLACE FUNCTION public.can_view_athlete_media(_viewer uuid, _athlete uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _viewer IS NOT NULL AND _athlete IS NOT NULL AND (
    _viewer = _athlete
    OR public.has_role(_viewer, 'owner'::app_role)
    OR public.has_role(_viewer, 'admin'::app_role)
    OR public.is_authorizing_parent(_viewer, _athlete)
    OR (
      NOT EXISTS (SELECT 1 FROM public.user_blocks b
                  WHERE (b.blocker_id = _viewer AND b.blocked_id = _athlete)
                     OR (b.blocker_id = _athlete AND b.blocked_id = _viewer))
      AND NOT public.is_under_13(_athlete)
      AND (
        public.is_coach_of(_viewer, _athlete)
        OR (
          EXISTS (SELECT 1 FROM public.scout_follows sf
                  WHERE sf.scout_id = _viewer AND sf.player_id = _athlete AND sf.status = 'accepted')
          AND (public.user_has_role(_viewer, 'coach'::app_role) OR public.user_has_role(_viewer, 'scout'::app_role)
               OR public.user_has_role(_viewer, 'recruiter'::app_role))
          AND (public.is_minor(_athlete) = false OR public.resolve_recruiting_scope(_athlete, 'video'))
        )
      )
    )
  );
$$;
REVOKE ALL ON FUNCTION public.can_view_athlete_media(uuid, uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.can_view_athlete_media(uuid, uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.is_staff_library_object(_name text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT ((storage.foldername(_name))[2] = 'library'
          OR ((storage.foldername(_name))[2] = 'thumbnails' AND storage.filename(_name) LIKE 'library\_%'))
     AND EXISTS (SELECT 1 FROM public.user_roles r
                 WHERE r.user_id::text = (storage.foldername(_name))[1]
                   AND r.role IN ('owner'::app_role, 'admin'::app_role)
                   AND coalesce(r.status, 'active') = 'active');
$$;
GRANT EXECUTE ON FUNCTION public.is_staff_library_object(text) TO authenticated, service_role;

-- storage read rules (buckets themselves are switched private separately)
DROP POLICY IF EXISTS "Public can view scout letters" ON storage.objects;
DROP POLICY IF EXISTS "Public can view scout videos" ON storage.objects;
CREATE POLICY "Applicant or owner/admin read scout application files" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id IN ('scout-letters','scout-videos')
         AND ((storage.foldername(name))[1] = auth.uid()::text
              OR public.has_role(auth.uid(), 'owner'::app_role)
              OR public.has_role(auth.uid(), 'admin'::app_role)));
CREATE POLICY "Allowed viewers read athlete videos" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'videos'
         AND (public.is_staff_library_object(name)
              OR public.can_view_athlete_media(auth.uid(), ((storage.foldername(name))[1])::uuid)));
CREATE POLICY "Signed-in read avatars, under-13 restricted" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'avatars'
         AND ((storage.foldername(name))[1] !~ '^[0-9a-f-]{36}$'
              OR NOT public.is_under_13(((storage.foldername(name))[1])::uuid)
              OR public.can_view_athlete_media(auth.uid(), ((storage.foldername(name))[1])::uuid)));

-- 2. Roles: self-service may only add player (active) or request coach/scout/recruiter (pending)
DROP POLICY IF EXISTS "Users can claim only a self-service role" ON public.user_roles;
CREATE POLICY "Users can add player role or request staff role" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND (
    (role = 'player'::app_role AND coalesce(status, 'active') = 'active')
    OR (role IN ('coach'::app_role, 'scout'::app_role, 'recruiter'::app_role) AND status = 'pending')));

DROP POLICY IF EXISTS "Users can insert own application" ON public.scout_applications;
CREATE POLICY "Users can insert own pending application" ON public.scout_applications
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND status = 'pending');

-- 3a. Organizations: self-join only as a plain player; coach authority needs coach role + staff seat
DROP POLICY IF EXISTS "Players can join via invite" ON public.organization_members;
CREATE POLICY "Players can join as player only" ON public.organization_members
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND role_in_org = 'player' AND status = 'active');

CREATE OR REPLACE FUNCTION public.is_coach_of(_coach uuid, _athlete uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  select
    _coach is not null
    and _athlete is not null
    and (
      exists (
        select 1 from public.athlete_mpi_settings a
        where a.user_id = _athlete
          and (_coach = a.primary_coach_id
               or _coach = any(coalesce(a.secondary_coach_ids,'{}'::uuid[])))
      )
      or (
        public.user_has_role(_coach, 'coach'::app_role)
        and exists (
          select 1 from public.organization_members om1
          join public.organization_members om2
            on om1.organization_id = om2.organization_id
          where om1.user_id = _coach and om2.user_id = _athlete
            and om1.status = 'active' and om2.status = 'active'
            and om1.role_in_org <> 'player'
        )
      )
      or (
        exists (
          select 1 from public.scout_follows sf
          where sf.scout_id = _coach and sf.player_id = _athlete
            and sf.status = 'accepted' and sf.relationship_type = 'linked'
        )
        and (public.is_minor(_athlete) = false or public.user_has_role(_coach, 'coach'::app_role))
      )
    );
$$;

-- 3b. Follows: new requests start pending; only the other side can accept; ids are fixed
CREATE OR REPLACE FUNCTION public.guard_follow_transitions()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE me uuid := auth.uid();
BEGIN
  IF me IS NULL OR public.has_role(me, 'owner'::app_role) OR public.has_role(me, 'admin'::app_role) THEN
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
END $$;
DROP TRIGGER IF EXISTS trg_guard_follow_transitions ON public.scout_follows;
CREATE TRIGGER trg_guard_follow_transitions BEFORE INSERT OR UPDATE ON public.scout_follows
  FOR EACH ROW EXECUTE FUNCTION public.guard_follow_transitions();

-- 3c. Folder grants: only the folder's owner may grant to a coach they are connected with
DROP POLICY IF EXISTS "Players manage own folder permissions" ON public.folder_coach_permissions;
CREATE POLICY "Folder owners manage folder permissions" ON public.folder_coach_permissions
  FOR ALL TO authenticated
  USING (granted_by = auth.uid()
         AND EXISTS (SELECT 1 FROM public.activity_folders f WHERE f.id = folder_id AND f.owner_id = auth.uid()))
  WITH CHECK (granted_by = auth.uid()
         AND EXISTS (SELECT 1 FROM public.activity_folders f WHERE f.id = folder_id AND f.owner_id = auth.uid())
         AND (revoked_at IS NOT NULL OR public.is_coach_of(coach_user_id, auth.uid())
              OR EXISTS (SELECT 1 FROM public.scout_follows sf WHERE sf.scout_id = coach_user_id
                         AND sf.player_id = auth.uid() AND sf.status = 'accepted')));
