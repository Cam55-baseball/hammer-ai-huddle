CREATE OR REPLACE FUNCTION public.resolve_recruiting_visibility(_athlete_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.athlete_recruiting_consent c
    WHERE c.athlete_id = _athlete_id AND c.visibility_enabled = true
      AND (public.is_minor(_athlete_id) = false
           OR (c.parent_authorized = true AND c.guardian_consented_at IS NOT NULL))
  );
$$;