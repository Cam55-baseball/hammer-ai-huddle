ALTER TABLE public.athlete_recruiting_consent
  ADD COLUMN IF NOT EXISTS parent_allowed_scopes text[] NOT NULL DEFAULT '{}';

-- Existing guardian-approved minors keep exactly what they had: backfill from their current switches.
UPDATE public.athlete_recruiting_consent c SET parent_allowed_scopes = array_remove(ARRAY[
  CASE WHEN c.share_profile THEN 'profile' END, CASE WHEN c.share_metrics THEN 'metrics' END,
  CASE WHEN c.share_video THEN 'video' END, CASE WHEN c.allow_contact THEN 'contact' END], NULL)
WHERE c.parent_authorized = true AND c.guardian_consented_at IS NOT NULL AND c.parent_allowed_scopes = '{}';

CREATE OR REPLACE FUNCTION public.resolve_recruiting_scope(_athlete_id uuid, _scope text)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.athlete_recruiting_consent c
    WHERE c.athlete_id = _athlete_id
      AND c.visibility_enabled = true
      AND (public.is_minor(_athlete_id) = false
           OR (c.parent_authorized = true AND c.guardian_consented_at IS NOT NULL
               AND _scope = ANY (c.parent_allowed_scopes)))
      AND CASE _scope
            WHEN 'profile' THEN c.share_profile
            WHEN 'metrics' THEN c.share_metrics
            WHEN 'video'   THEN c.share_video
            WHEN 'contact' THEN c.allow_contact AND NOT public.is_under_13(_athlete_id)
            WHEN 'health'  THEN c.share_health
            WHEN 'academics' THEN c.share_academics
            ELSE false END
  );
$function$;

-- Only a linked parent may change the parent checklist; an under-13 child may not change any sharing at all.
CREATE OR REPLACE FUNCTION public.guard_recruiting_parent_checklist()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_actor uuid := auth.uid();
BEGIN
  IF v_actor IS NULL THEN RETURN NEW; END IF;
  IF NEW.parent_allowed_scopes IS DISTINCT FROM (CASE WHEN TG_OP='INSERT' THEN '{}'::text[] ELSE OLD.parent_allowed_scopes END)
     AND NOT public.is_authorizing_parent(v_actor, NEW.athlete_id) THEN
    RAISE EXCEPTION 'Only a linked parent can change what a minor may share' USING ERRCODE='42501';
  END IF;
  IF v_actor = NEW.athlete_id AND public.is_under_13(NEW.athlete_id) THEN
    RAISE EXCEPTION 'A parent manages sharing for players under 13' USING ERRCODE='42501';
  END IF;
  RETURN NEW;
END;
$function$;
DROP TRIGGER IF EXISTS trg_guard_recruiting_parent_checklist ON public.athlete_recruiting_consent;
CREATE TRIGGER trg_guard_recruiting_parent_checklist BEFORE INSERT OR UPDATE ON public.athlete_recruiting_consent
  FOR EACH ROW EXECUTE FUNCTION public.guard_recruiting_parent_checklist();