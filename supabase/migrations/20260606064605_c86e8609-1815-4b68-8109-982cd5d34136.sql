
-- =============================================================
-- RR-9 / RR-10 Authority Correction Sprint
-- Athlete-owned recruiting consent + audit lineage
-- =============================================================

-- 1) Canonical consent table (single source of truth)
CREATE TABLE public.athlete_recruiting_consent (
  athlete_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  visibility_enabled boolean NOT NULL DEFAULT false,
  parent_authorized boolean NOT NULL DEFAULT false,
  last_changed_at timestamptz NOT NULL DEFAULT now(),
  last_changed_by uuid NOT NULL,
  engine_version text NOT NULL DEFAULT 'rr9-1.0.0',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.athlete_recruiting_consent TO authenticated;
GRANT ALL ON public.athlete_recruiting_consent TO service_role;

ALTER TABLE public.athlete_recruiting_consent ENABLE ROW LEVEL SECURITY;

-- 2) Audit lineage (append-only)
CREATE TABLE public.athlete_recruiting_consent_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id uuid NOT NULL,
  previous_state jsonb,
  new_state jsonb NOT NULL,
  changed_at timestamptz NOT NULL DEFAULT now(),
  changed_by uuid NOT NULL,
  actor_role text NOT NULL DEFAULT 'athlete',
  reason text,
  engine_version text NOT NULL DEFAULT 'rr9-1.0.0'
);

CREATE INDEX idx_arc_audit_athlete ON public.athlete_recruiting_consent_audit (athlete_id, changed_at DESC);

GRANT SELECT ON public.athlete_recruiting_consent_audit TO authenticated;
GRANT ALL ON public.athlete_recruiting_consent_audit TO service_role;

ALTER TABLE public.athlete_recruiting_consent_audit ENABLE ROW LEVEL SECURITY;

-- 3) is_minor helper (derives from profiles.date_of_birth; unknown = false = adult treatment NOT permitted →
--    we conservatively return TRUE for unknown to fail-closed under RR-10 minor protection.)
CREATE OR REPLACE FUNCTION public.is_minor(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN dob IS NULL THEN true   -- fail-closed: unknown DOB → treat as minor
    ELSE (date_part('year', age(dob))::int < 18)
  END
  FROM (
    SELECT date_of_birth AS dob FROM public.profiles WHERE id = _user_id
  ) p;
$$;

GRANT EXECUTE ON FUNCTION public.is_minor(uuid) TO authenticated, service_role;

-- 4) resolve_recruiting_visibility — server authority for whether athlete is visible.
CREATE OR REPLACE FUNCTION public.resolve_recruiting_visibility(_athlete_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.athlete_recruiting_consent c
    WHERE c.athlete_id = _athlete_id
      AND c.visibility_enabled = true
      AND (
        public.is_minor(_athlete_id) = false
        OR c.parent_authorized = true
      )
  );
$$;

GRANT EXECUTE ON FUNCTION public.resolve_recruiting_visibility(uuid) TO authenticated, service_role;

-- 5) Audit trigger — record every insert/update.
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
BEGIN
  v_actor := COALESCE(auth.uid(), NEW.last_changed_by);
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
    (NEW.athlete_id, v_prev, v_new, now(), v_actor, 'athlete', NEW.engine_version);

  NEW.last_changed_at := now();
  NEW.last_changed_by := v_actor;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_record_recruiting_consent_change
  BEFORE INSERT OR UPDATE ON public.athlete_recruiting_consent
  FOR EACH ROW EXECUTE FUNCTION public.record_recruiting_consent_change();

-- 6) RLS policies — consent table
-- Athlete may read own row.
CREATE POLICY "athlete reads own consent"
  ON public.athlete_recruiting_consent
  FOR SELECT
  TO authenticated
  USING (athlete_id = auth.uid());

-- Coach/recruiter/scout may read consent rows only when visibility resolves true.
-- (Server-side fail-closed gate. Direct query bypass is blocked here.)
CREATE POLICY "viewers read resolved-visible consent"
  ON public.athlete_recruiting_consent
  FOR SELECT
  TO authenticated
  USING (
    athlete_id <> auth.uid()
    AND public.resolve_recruiting_visibility(athlete_id) = true
    AND (
      public.has_role(auth.uid(), 'coach'::app_role)
      OR public.has_role(auth.uid(), 'recruiter'::app_role)
      OR public.has_role(auth.uid(), 'scout'::app_role)
    )
  );

-- Athlete may insert own row.
CREATE POLICY "athlete inserts own consent"
  ON public.athlete_recruiting_consent
  FOR INSERT
  TO authenticated
  WITH CHECK (athlete_id = auth.uid() AND last_changed_by = auth.uid());

-- Athlete may update own row.
CREATE POLICY "athlete updates own consent"
  ON public.athlete_recruiting_consent
  FOR UPDATE
  TO authenticated
  USING (athlete_id = auth.uid())
  WITH CHECK (athlete_id = auth.uid());

-- 7) RLS policies — audit table (athlete-self read only; writes via trigger / service_role)
CREATE POLICY "athlete reads own consent audit"
  ON public.athlete_recruiting_consent_audit
  FOR SELECT
  TO authenticated
  USING (athlete_id = auth.uid());

-- 8) updated_at trigger reuse
CREATE TRIGGER trg_arc_updated_at
  BEFORE UPDATE ON public.athlete_recruiting_consent
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
