
-- P1-F: Parent Authorization Completion Sprint
-- Adds canonical parent↔athlete linkage, authority helper, and trigger
-- enforcement so only authorizing parents may write parent_authorized.

-- 1. Parent↔athlete linkage table
CREATE TABLE IF NOT EXISTS public.parent_athlete_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  athlete_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  relationship text NOT NULL DEFAULT 'parent',
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'active', 'revoked')),
  invited_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (parent_user_id, athlete_user_id)
);

CREATE INDEX IF NOT EXISTS idx_pal_parent  ON public.parent_athlete_links(parent_user_id, status);
CREATE INDEX IF NOT EXISTS idx_pal_athlete ON public.parent_athlete_links(athlete_user_id, status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.parent_athlete_links TO authenticated;
GRANT ALL ON public.parent_athlete_links TO service_role;

ALTER TABLE public.parent_athlete_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "parent reads own links"
  ON public.parent_athlete_links FOR SELECT
  TO authenticated
  USING (parent_user_id = auth.uid());

CREATE POLICY "athlete reads own links"
  ON public.parent_athlete_links FOR SELECT
  TO authenticated
  USING (athlete_user_id = auth.uid());

-- Parent or athlete may create the link (typically populated by the
-- existing parent_invite_dispatches accept flow running as parent).
CREATE POLICY "parent or athlete inserts link"
  ON public.parent_athlete_links FOR INSERT
  TO authenticated
  WITH CHECK (parent_user_id = auth.uid() OR athlete_user_id = auth.uid());

CREATE POLICY "parent or athlete updates own link"
  ON public.parent_athlete_links FOR UPDATE
  TO authenticated
  USING (parent_user_id = auth.uid() OR athlete_user_id = auth.uid())
  WITH CHECK (parent_user_id = auth.uid() OR athlete_user_id = auth.uid());

CREATE TRIGGER trg_pal_updated_at
  BEFORE UPDATE ON public.parent_athlete_links
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Canonical authority helper: is the caller an active authorizing parent?
CREATE OR REPLACE FUNCTION public.is_authorizing_parent(_parent uuid, _athlete uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.parent_athlete_links
    WHERE parent_user_id  = _parent
      AND athlete_user_id = _athlete
      AND status = 'active'
      AND revoked_at IS NULL
  );
$$;

-- 3. RLS extension on athlete_recruiting_consent: parent may read & update
--    their athlete's consent row. The trigger below ensures only the
--    parent_authorized column may be flipped via this surface.
CREATE POLICY "authorizing parent reads consent"
  ON public.athlete_recruiting_consent FOR SELECT
  TO authenticated
  USING (public.is_authorizing_parent(auth.uid(), athlete_id));

CREATE POLICY "authorizing parent updates parent_authorized"
  ON public.athlete_recruiting_consent FOR UPDATE
  TO authenticated
  USING (public.is_authorizing_parent(auth.uid(), athlete_id))
  WITH CHECK (public.is_authorizing_parent(auth.uid(), athlete_id));

-- Parent may also INSERT the consent row (initial authorization for an
-- athlete who has not yet visited their own consent surface).
CREATE POLICY "authorizing parent inserts consent"
  ON public.athlete_recruiting_consent FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_authorizing_parent(auth.uid(), athlete_id)
    AND last_changed_by = auth.uid()
  );

-- 4. Authority enforcement trigger: parent_authorized may only be changed
--    by an authorizing parent. Athletes, coaches, recruiters, scouts and
--    admins are blocked at the database boundary regardless of RLS.
CREATE OR REPLACE FUNCTION public.enforce_parent_authorization_authority()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_prev  boolean := COALESCE(OLD.parent_authorized, false);
  v_next  boolean := COALESCE(NEW.parent_authorized, false);
BEGIN
  -- On INSERT, parent_authorized defaults to false; if set true the
  -- inserter must be an authorizing parent.
  IF TG_OP = 'INSERT' THEN
    IF v_next = true AND NOT public.is_authorizing_parent(v_actor, NEW.athlete_id) THEN
      RAISE EXCEPTION 'rr10: only an authorizing parent may set parent_authorized'
        USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
  END IF;

  -- On UPDATE, only block when the value is actually being changed.
  IF v_prev IS DISTINCT FROM v_next THEN
    IF v_actor IS NULL OR NOT public.is_authorizing_parent(v_actor, NEW.athlete_id) THEN
      RAISE EXCEPTION 'rr10: only an authorizing parent may change parent_authorized'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Run before the existing audit trigger so blocked writes never produce
-- audit rows.
CREATE TRIGGER trg_enforce_parent_authorization_authority
  BEFORE INSERT OR UPDATE ON public.athlete_recruiting_consent
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_parent_authorization_authority();

-- 5. Tag audit rows with actor_role = 'parent' when the change is made
--    by an authorizing parent (additive — preserves existing behaviour
--    for athlete-driven changes).
CREATE OR REPLACE FUNCTION public.record_recruiting_consent_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prev jsonb;
  v_new jsonb;
  v_actor uuid;
  v_role text := 'athlete';
BEGIN
  v_actor := COALESCE(auth.uid(), NEW.last_changed_by);
  IF v_actor IS NOT NULL
     AND v_actor <> NEW.athlete_id
     AND public.is_authorizing_parent(v_actor, NEW.athlete_id) THEN
    v_role := 'parent';
  END IF;

  v_new := jsonb_build_object(
    'visibility_enabled', NEW.visibility_enabled,
    'parent_authorized', NEW.parent_authorized,
    'engine_version', NEW.engine_version
  );

  IF TG_OP = 'UPDATE' THEN
    v_prev := jsonb_build_object(
      'visibility_enabled', OLD.visibility_enabled,
      'parent_authorized', OLD.parent_authorized,
      'engine_version', OLD.engine_version
    );
    IF v_prev = v_new THEN
      RETURN NEW;
    END IF;
  END IF;

  INSERT INTO public.athlete_recruiting_consent_audit
    (athlete_id, previous_state, new_state, changed_at, changed_by, actor_role, engine_version)
  VALUES
    (NEW.athlete_id, v_prev, v_new, now(), v_actor, v_role, NEW.engine_version);

  NEW.last_changed_at := now();
  NEW.last_changed_by := v_actor;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
