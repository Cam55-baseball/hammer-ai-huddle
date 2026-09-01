CREATE OR REPLACE FUNCTION public.grade_row_overall(g public.vault_scout_grades)
RETURNS numeric
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT COALESCE(
    g.overall_grade::numeric,
    (
      SELECT AVG(v)::numeric
      FROM unnest(ARRAY[
        g.hitting_grade, g.power_grade, g.speed_grade,
        g.throwing_grade, g.defense_grade,
        g.fastball_grade, g.control_grade, g.delivery_grade
      ]) AS v
      WHERE v IS NOT NULL
    )
  )
$$;

CREATE OR REPLACE FUNCTION public.scout_calibration_summary()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me uuid := auth.uid();
  tools text[] := ARRAY['hitting','power','speed','throwing','defense','fastball','control','delivery'];
  t text;
  per_tool jsonb := '[]'::jsonb;
  row_rec record;
  total_pairs int := 0;
  weighted_abs numeric := 0;
  weighted_signed numeric := 0;
  reports int := 0;
  athletes int := 0;
  high_ids uuid[];
  high_success int := 0;
BEGIN
  IF me IS NULL THEN
    RETURN jsonb_build_object('error','unauthenticated');
  END IF;

  SELECT count(*), count(DISTINCT user_id)
    INTO reports, athletes
  FROM public.vault_scout_grades
  WHERE evaluator_id = me AND user_id IS NOT NULL;

  FOREACH t IN ARRAY tools LOOP
    EXECUTE format($q$
      WITH mine AS (
        SELECT user_id, graded_at, %1$I::numeric AS val
        FROM public.vault_scout_grades
        WHERE evaluator_id = $1 AND user_id IS NOT NULL
          AND COALESCE(grade_source,'scout_evaluated') <> 'cv_measured'
          AND %1$I IS NOT NULL
      ),
      sys AS (
        SELECT user_id, graded_at, %1$I::numeric AS val
        FROM public.vault_scout_grades
        WHERE grade_source = 'cv_measured' AND %1$I IS NOT NULL
      ),
      paired AS (
        SELECT m.val AS scout_val,
               (SELECT s.val FROM sys s
                 WHERE s.user_id = m.user_id
                   AND s.graded_at BETWEEN m.graded_at - interval '120 days'
                                       AND m.graded_at + interval '120 days'
                 ORDER BY abs(extract(epoch FROM (s.graded_at - m.graded_at)))
                 LIMIT 1) AS sys_val
        FROM mine m
      )
      SELECT count(*)::int AS n,
             avg(scout_val)::numeric AS avg_scout,
             avg(sys_val)::numeric AS avg_system,
             avg(scout_val - sys_val)::numeric AS signed_dev,
             avg(abs(scout_val - sys_val))::numeric AS abs_dev
      FROM paired WHERE sys_val IS NOT NULL
    $q$, t || '_grade')
    INTO row_rec USING me;

    per_tool := per_tool || jsonb_build_array(jsonb_build_object(
      'tool', t,
      'pairs', COALESCE(row_rec.n, 0),
      'avg_scout', round(COALESCE(row_rec.avg_scout, 0), 1),
      'avg_system', round(COALESCE(row_rec.avg_system, 0), 1),
      'signed_dev', CASE WHEN COALESCE(row_rec.n,0) > 0 THEN round(row_rec.signed_dev, 1) END,
      'abs_dev', CASE WHEN COALESCE(row_rec.n,0) > 0 THEN round(row_rec.abs_dev, 1) END
    ));

    IF COALESCE(row_rec.n, 0) > 0 THEN
      total_pairs := total_pairs + row_rec.n;
      weighted_abs := weighted_abs + row_rec.abs_dev * row_rec.n;
      weighted_signed := weighted_signed + row_rec.signed_dev * row_rec.n;
    END IF;
  END LOOP;

  SELECT array_agg(DISTINCT user_id) INTO high_ids
  FROM public.vault_scout_grades g
  WHERE g.evaluator_id = me AND g.user_id IS NOT NULL
    AND public.grade_row_overall(g) >= 55;

  IF high_ids IS NOT NULL THEN
    SELECT count(DISTINCT sm.athlete_user_id) INTO high_success
    FROM public.standard_matches sm
    WHERE sm.athlete_user_id = ANY(high_ids)
      AND sm.matched_at > (
        SELECT min(g2.graded_at) FROM public.vault_scout_grades g2
        WHERE g2.evaluator_id = me AND g2.user_id = sm.athlete_user_id
      );
  END IF;

  RETURN jsonb_build_object(
    'reports', reports,
    'athletes_graded', athletes,
    'per_tool', per_tool,
    'total_pairs', total_pairs,
    'avg_abs_deviation', CASE WHEN total_pairs > 0 THEN round(weighted_abs / total_pairs, 1) END,
    'avg_signed_deviation', CASE WHEN total_pairs > 0 THEN round(weighted_signed / total_pairs, 1) END,
    'high_graded_athletes', COALESCE(array_length(high_ids, 1), 0),
    'high_graded_with_success', high_success
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.coach_calibration_summary()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me uuid := auth.uid();
  result jsonb;
BEGIN
  IF me IS NULL THEN
    RETURN jsonb_build_object('error','unauthenticated');
  END IF;

  WITH rel AS (
    SELECT a.user_id AS athlete_id, a.created_at AS since
    FROM public.athlete_mpi_settings a
    WHERE a.primary_coach_id = me OR me = ANY(COALESCE(a.secondary_coach_ids,'{}'::uuid[]))
    UNION ALL
    SELECT om2.user_id, om2.joined_at
    FROM public.organization_members om1
    JOIN public.organization_members om2 ON om1.organization_id = om2.organization_id
    WHERE om1.user_id = me AND om2.user_id <> me
      AND om1.status = 'active' AND om2.status = 'active'
    UNION ALL
    SELECT sf.player_id, sf.created_at
    FROM public.scout_follows sf
    WHERE sf.scout_id = me AND sf.status = 'accepted' AND sf.relationship_type = 'linked'
  ),
  roster AS (
    SELECT athlete_id, min(since) AS coached_since
    FROM rel WHERE athlete_id IS NOT NULL GROUP BY athlete_id
  ),
  graded AS (
    SELECT r.athlete_id, r.coached_since, g.graded_at,
           public.grade_row_overall(g) AS overall
    FROM roster r
    JOIN public.vault_scout_grades g
      ON g.user_id = r.athlete_id AND g.graded_at >= r.coached_since
    WHERE public.grade_row_overall(g) IS NOT NULL
  ),
  bounds AS (
    SELECT athlete_id, coached_since,
           count(*)::int AS grade_count,
           min(graded_at) AS first_at,
           max(graded_at) AS last_at,
           (array_agg(overall ORDER BY graded_at ASC))[1] AS first_overall,
           (array_agg(overall ORDER BY graded_at DESC))[1] AS last_overall
    FROM graded GROUP BY athlete_id, coached_since
  ),
  deltas AS (
    SELECT b.*, (b.last_overall - b.first_overall) AS delta
    FROM bounds b WHERE b.grade_count >= 2
  ),
  full_season AS (
    SELECT r.athlete_id
    FROM roster r
    WHERE now() - r.coached_since >= interval '180 days'
  ),
  success AS (
    SELECT count(DISTINCT sm.athlete_user_id)::int AS n
    FROM public.standard_matches sm
    JOIN roster r ON r.athlete_id = sm.athlete_user_id
    JOIN full_season fs ON fs.athlete_id = sm.athlete_user_id
    WHERE sm.matched_at > r.coached_since
  )
  SELECT jsonb_build_object(
    'roster_size', (SELECT count(*)::int FROM roster),
    'players_with_delta', (SELECT count(*)::int FROM deltas),
    'avg_delta', (SELECT round(avg(delta), 1) FROM deltas),
    'improved', (SELECT count(*)::int FROM deltas WHERE delta > 0),
    'declined', (SELECT count(*)::int FROM deltas WHERE delta < 0),
    'flat', (SELECT count(*)::int FROM deltas WHERE delta = 0),
    'best_delta', (SELECT round(max(delta), 1) FROM deltas),
    'full_season_players', (SELECT count(*)::int FROM full_season),
    'full_season_with_success', (SELECT n FROM success),
    'players', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'athlete_id', d.athlete_id,
        'coached_since', d.coached_since,
        'grade_count', d.grade_count,
        'first_overall', round(d.first_overall, 1),
        'last_overall', round(d.last_overall, 1),
        'delta', round(d.delta, 1)
      ) ORDER BY d.delta DESC)
      FROM deltas d
    ), '[]'::jsonb)
  ) INTO result;

  RETURN result;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.scout_calibration_summary() FROM anon;
REVOKE EXECUTE ON FUNCTION public.coach_calibration_summary() FROM anon;
GRANT EXECUTE ON FUNCTION public.scout_calibration_summary() TO authenticated;
GRANT EXECUTE ON FUNCTION public.coach_calibration_summary() TO authenticated;
GRANT EXECUTE ON FUNCTION public.grade_row_overall(public.vault_scout_grades) TO authenticated;