CREATE OR REPLACE FUNCTION public.org_test_ranking(_org uuid, _test text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); _staff boolean;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not authenticated' USING errcode = '42501'; END IF;
  _staff := public.is_org_staff(_uid, _org);
  IF NOT _staff AND NOT EXISTS (SELECT 1 FROM org_athlete_assignments a WHERE a.organization_id = _org AND a.coach_user_id = _uid AND a.revoked_at IS NULL) THEN
    RAISE EXCEPTION 'not allowed' USING errcode = '42501';
  END IF;
  RETURN jsonb_build_object(
    'tests', coalesce((
      SELECT jsonb_agg(DISTINCT k.key ORDER BY k.key)
      FROM organization_members m
      JOIN vault_performance_tests t ON t.user_id = m.user_id
      CROSS JOIN LATERAL jsonb_each(coalesce(t.results,'{}'::jsonb)) k
      WHERE m.organization_id = _org AND m.role_in_org = 'player' AND m.status = 'active'
        AND left(k.key,1) <> '_' AND jsonb_typeof(k.value) = 'number'
        AND (_staff OR EXISTS (SELECT 1 FROM org_athlete_assignments a WHERE a.organization_id = _org AND a.coach_user_id = _uid AND a.athlete_user_id = m.user_id AND a.revoked_at IS NULL))
    ), '[]'::jsonb),
    'rows', coalesce((
      SELECT jsonb_agg(row_to_json(x))
      FROM (
        SELECT m.user_id AS athlete_id,
          coalesce(nullif(trim(p.first_name || ' ' || p.last_name), ''), nullif(trim(p.full_name), ''), 'Player') AS name,
          ms.primary_position, ms.league_tier,
          coalesce(ms.date_of_birth, p.date_of_birth) AS date_of_birth,
          lt.value, lt.test_date, lt.verified
        FROM organization_members m
        LEFT JOIN profiles p ON p.id = m.user_id
        LEFT JOIN athlete_mpi_settings ms ON ms.user_id = m.user_id
        CROSS JOIN LATERAL (
          SELECT (t.results ->> _test)::numeric AS value, coalesce(t.test_date, t.created_at::date) AS test_date,
                 (t.results ->> '_verified') = 'in_person' AS verified
          FROM vault_performance_tests t
          WHERE t.user_id = m.user_id AND jsonb_typeof(t.results -> _test) = 'number'
          ORDER BY coalesce(t.test_date, t.created_at::date) DESC, t.created_at DESC LIMIT 1
        ) lt
        WHERE m.organization_id = _org AND m.role_in_org = 'player' AND m.status = 'active' AND _test IS NOT NULL
          AND (_staff OR EXISTS (SELECT 1 FROM org_athlete_assignments a WHERE a.organization_id = _org AND a.coach_user_id = _uid AND a.athlete_user_id = m.user_id AND a.revoked_at IS NULL))
      ) x
    ), '[]'::jsonb)
  );
END $$;
REVOKE ALL ON FUNCTION public.org_test_ranking(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.org_test_ranking(uuid,text) TO authenticated, service_role;