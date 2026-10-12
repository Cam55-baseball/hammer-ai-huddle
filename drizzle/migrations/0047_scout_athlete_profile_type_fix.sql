CREATE OR REPLACE FUNCTION public.scout_athlete_profile(_athlete uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v uuid := auth.uid();
  sp boolean; sm boolean; sv boolean; sa boolean;
  _overview jsonb; _academics jsonb; _tests jsonb; _reports jsonb; _recap jsonb; _grades jsonb; _club jsonb;
BEGIN
  sp := public.scout_can_view_scope(v, _athlete, 'profile');
  sm := public.scout_can_view_scope(v, _athlete, 'metrics');
  sv := public.scout_can_view_scope(v, _athlete, 'video');
  sa := public.scout_can_view_scope(v, _athlete, 'academics');
  IF NOT (sp OR sm OR sv OR sa) THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;

  IF sp THEN
    SELECT jsonb_build_object(
      'full_name', p.full_name, 'sport', m.sport,
      'primary_position', COALESCE(m.primary_position::text, p.position::text), 'secondary_position', m.secondary_position,
      'bats', COALESCE(p.primary_batting_side::text, p.batting_side::text), 'throws', COALESCE(m.primary_throwing_hand::text, p.primary_throwing_hand::text, p.throwing_hand::text),
      'level', p.experience_level, 'team', p.team_affiliation, 'region', p.state,
      'grad_year', COALESCE(p.high_school_grad_year::text, p.graduation_year::text, p.college_grad_year::text),
      'recruiting_status', p.commitment_status)
    INTO _overview
    FROM public.profiles p LEFT JOIN public.athlete_mpi_settings m ON m.user_id = p.id
    WHERE p.id = _athlete LIMIT 1;
  END IF;

  IF sa THEN
    SELECT jsonb_build_object('gpa', p.gpa, 'sat', p.sat_score, 'act', p.act_score,
      'transcript_status', (SELECT t.status FROM public.academic_transcripts t WHERE t.athlete_id = _athlete ORDER BY t.uploaded_at DESC LIMIT 1),
      'transcript_reviewed_at', (SELECT t.reviewed_at FROM public.academic_transcripts t WHERE t.athlete_id = _athlete ORDER BY t.uploaded_at DESC LIMIT 1))
    INTO _academics FROM public.profiles p WHERE p.id = _athlete;
  END IF;

  IF sm THEN
    SELECT COALESCE(jsonb_agg(jsonb_build_object('test_date', t.test_date, 'test_type', t.test_type, 'results', t.results) ORDER BY t.test_date DESC), '[]'::jsonb)
    INTO _tests FROM (SELECT * FROM public.vault_performance_tests WHERE user_id = _athlete ORDER BY test_date DESC LIMIT 20) t;
    SELECT jsonb_build_object('period_start', r.recap_period_start, 'period_end', r.recap_period_end,
      'strength_change_percent', r.strength_change_percent, 'total_weight_lifted', r.total_weight_lifted)
    INTO _recap FROM public.vault_recaps r WHERE r.user_id = _athlete ORDER BY r.recap_period_end DESC LIMIT 1;
    SELECT COALESCE(jsonb_agg(jsonb_build_object('graded_at', g.graded_at, 'grade_type', g.grade_type, 'grade_source', g.grade_source,
      'overall_grade', g.overall_grade, 'position_evaluated', g.position_evaluated) ORDER BY g.graded_at DESC NULLS LAST), '[]'::jsonb)
    INTO _grades FROM (SELECT * FROM public.vault_scout_grades WHERE user_id = _athlete ORDER BY graded_at DESC NULLS LAST LIMIT 10) g;
  END IF;

  IF sv THEN
    SELECT COALESCE(jsonb_agg(jsonb_build_object('created_at', q.created_at, 'module', q.module, 'efficiency_score', q.efficiency_score) ORDER BY q.created_at DESC), '[]'::jsonb)
    INTO _reports FROM (SELECT * FROM public.videos WHERE user_id = _athlete AND ai_analysis IS NOT NULL ORDER BY created_at DESC LIMIT 10) q;
    SELECT COALESCE(jsonb_agg(jsonb_build_object('created_at', q.created_at, 'title', q.library_title, 'module', q.module) ORDER BY q.created_at DESC), '[]'::jsonb)
    INTO _club FROM (SELECT * FROM public.videos WHERE user_id = _athlete AND library_title IS NOT NULL ORDER BY created_at DESC LIMIT 20) q;
  END IF;

  RETURN jsonb_build_object(
    'shared', jsonb_build_object('profile', sp, 'metrics', sm, 'video', sv, 'academics', sa),
    'overview', _overview, 'academics', _academics, 'tests', _tests, 'recap', _recap,
    'grades', _grades, 'reports', _reports, 'players_club', _club);
END; $$;