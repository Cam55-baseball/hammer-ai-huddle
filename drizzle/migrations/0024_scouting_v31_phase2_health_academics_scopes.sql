ALTER TABLE public.athlete_recruiting_consent
  ADD COLUMN IF NOT EXISTS share_health boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS share_academics boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.resolve_recruiting_scope(_athlete_id uuid, _scope text)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
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
            WHEN 'contact' THEN c.allow_contact AND NOT public.is_under_13(_athlete_id)
            WHEN 'health'  THEN c.share_health
            WHEN 'academics' THEN c.share_academics
            ELSE false END
  );
$function$;