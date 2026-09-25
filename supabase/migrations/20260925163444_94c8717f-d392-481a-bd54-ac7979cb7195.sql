ALTER TABLE public.athlete_recruiting_consent
  ADD COLUMN IF NOT EXISTS share_profile boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS share_metrics boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS share_video boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS allow_contact boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS guardian_consented_by uuid,
  ADD COLUMN IF NOT EXISTS guardian_consented_at timestamptz;

CREATE OR REPLACE FUNCTION public.stamp_guardian_consent()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.parent_authorized = true AND (TG_OP = 'INSERT' OR COALESCE(OLD.parent_authorized,false) = false) THEN
    NEW.guardian_consented_by := auth.uid();
    NEW.guardian_consented_at := now();
  ELSIF NEW.parent_authorized = false THEN
    NEW.guardian_consented_by := NULL;
    NEW.guardian_consented_at := NULL;
  ELSE
    NEW.guardian_consented_by := OLD.guardian_consented_by;
    NEW.guardian_consented_at := OLD.guardian_consented_at;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_stamp_guardian_consent ON public.athlete_recruiting_consent;
CREATE TRIGGER trg_stamp_guardian_consent BEFORE INSERT OR UPDATE ON public.athlete_recruiting_consent
FOR EACH ROW EXECUTE FUNCTION public.stamp_guardian_consent();

CREATE OR REPLACE FUNCTION public.record_recruiting_consent_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_prev jsonb; v_new jsonb; v_actor uuid; v_role text := 'athlete';
BEGIN
  v_actor := COALESCE(auth.uid(), NEW.last_changed_by);
  IF v_actor IS NOT NULL AND v_actor <> NEW.athlete_id AND public.is_authorizing_parent(v_actor, NEW.athlete_id) THEN
    v_role := 'parent';
  END IF;
  v_new := jsonb_build_object('visibility_enabled', NEW.visibility_enabled, 'parent_authorized', NEW.parent_authorized,
    'share_profile', NEW.share_profile, 'share_metrics', NEW.share_metrics, 'share_video', NEW.share_video,
    'allow_contact', NEW.allow_contact, 'engine_version', NEW.engine_version);
  IF TG_OP = 'UPDATE' THEN
    v_prev := jsonb_build_object('visibility_enabled', OLD.visibility_enabled, 'parent_authorized', OLD.parent_authorized,
      'share_profile', OLD.share_profile, 'share_metrics', OLD.share_metrics, 'share_video', OLD.share_video,
      'allow_contact', OLD.allow_contact, 'engine_version', OLD.engine_version);
    IF v_prev = v_new THEN RETURN NEW; END IF;
  END IF;
  INSERT INTO public.athlete_recruiting_consent_audit (athlete_id, previous_state, new_state, changed_at, changed_by, actor_role, engine_version)
  VALUES (NEW.athlete_id, v_prev, v_new, now(), v_actor, v_role, NEW.engine_version);
  NEW.last_changed_at := now(); NEW.last_changed_by := v_actor; NEW.updated_at := now();
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.resolve_recruiting_scope(_athlete_id uuid, _scope text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.athlete_recruiting_consent c
    WHERE c.athlete_id = _athlete_id
      AND c.visibility_enabled = true
      AND (public.is_minor(_athlete_id) = false
           OR (c.parent_authorized = true AND c.guardian_consented_at IS NOT NULL))
      AND CASE _scope
            WHEN 'profile' THEN c.share_profile
            WHEN 'metrics' THEN c.share_metrics
            WHEN 'video'   THEN c.share_video
            WHEN 'contact' THEN c.allow_contact
            ELSE false END
  );
$$;
GRANT EXECUTE ON FUNCTION public.resolve_recruiting_scope(uuid, text) TO authenticated;