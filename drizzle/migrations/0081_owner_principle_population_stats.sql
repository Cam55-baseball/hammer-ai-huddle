CREATE OR REPLACE FUNCTION public.owner_principle_population_stats()
RETURNS TABLE(principle_id uuid, advice integer, followed integer, players_followed integer, worked integer, no_change integer, got_worse integer, players_worked integer, hidden_small_group boolean)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE k constant int := 3;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  WITH r AS (
    SELECT v.principle_id, rec.*
    FROM public.intelligence_recommendations rec
    JOIN public.coaching_principle_versions v ON v.id = rec.principle_version_id
    WHERE NOT EXISTS (SELECT 1 FROM public.athlete_mpi_settings s WHERE s.user_id = rec.user_id AND s.admin_ranking_excluded IS TRUE)
  ), agg AS (
    SELECT r.principle_id,
      count(r.id)::int a, count(r.id) FILTER (WHERE r.followed)::int f,
      count(DISTINCT r.user_id) FILTER (WHERE r.followed)::int pf,
      count(r.id) FILTER (WHERE r.outcome='worked')::int w,
      count(r.id) FILTER (WHERE r.outcome='no_change')::int nc,
      count(r.id) FILTER (WHERE r.outcome='got_worse')::int gw,
      count(DISTINCT r.user_id) FILTER (WHERE r.outcome='worked')::int pw,
      count(DISTINCT r.user_id)::int pa
    FROM r GROUP BY r.principle_id
  )
  SELECT agg.principle_id,
    CASE WHEN pa >= k THEN a END, CASE WHEN pf >= k THEN f END, CASE WHEN pf >= k THEN pf END,
    CASE WHEN pf >= k THEN w END, CASE WHEN pf >= k THEN nc END, CASE WHEN pf >= k THEN gw END,
    CASE WHEN pw >= k THEN pw END,
    (pa < k OR pf < k)
  FROM agg;
END $$;
REVOKE ALL ON FUNCTION public.owner_principle_population_stats() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.owner_principle_population_stats() TO authenticated;