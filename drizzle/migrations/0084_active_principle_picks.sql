CREATE OR REPLACE FUNCTION public.active_principle_picks()
RETURNS TABLE(id uuid, sport text, area text, situation text, applies_when text, not_when text, connected_work text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT v.id, v.sport, v.area, v.situation, v.applies_when, v.not_when, v.connected_work
  FROM public.coaching_principles p
  JOIN public.coaching_principle_versions v
    ON v.principle_id = p.id AND v.version = p.current_version
  WHERE p.active = true;
$$;

REVOKE ALL ON FUNCTION public.active_principle_picks() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.active_principle_picks() TO authenticated;