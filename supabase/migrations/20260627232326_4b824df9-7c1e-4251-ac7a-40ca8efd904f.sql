ALTER TABLE public.athlete_context
  ADD COLUMN IF NOT EXISTS category_goals jsonb;

COMMENT ON COLUMN public.athlete_context.category_goals IS
  'CategoryGoalsPayload v1 — { version, goals:[{category,rank,intent,notes?}], updatedAt }. Five canonical categories ranked 1..5 with optional preset intent. NULL = missing.';

CREATE OR REPLACE FUNCTION public.get_athlete_context_envelope(p_user uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ctx public.athlete_context%ROWTYPE;
  v_profile record;
  v_persistent_equip public.athlete_equipment_context%ROWTYPE;
  v_session_equip public.athlete_equipment_context%ROWTYPE;
  v_now timestamptz := now();
  v_lifecycle_band text;
  v_age_years numeric;
  v_result jsonb := '{}'::jsonb;
BEGIN
  IF auth.uid() IS NULL OR (auth.uid() <> p_user AND NOT public.has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_ctx FROM public.athlete_context WHERE user_id = p_user;
  SELECT date_of_birth, first_name, last_name, sex, position, experience_level
    INTO v_profile FROM public.profiles WHERE id = p_user;

  SELECT * INTO v_session_equip
    FROM public.athlete_equipment_context
    WHERE user_id = p_user AND scope = 'session'
      AND (valid_until IS NULL OR valid_until > v_now)
    ORDER BY created_at DESC LIMIT 1;
  SELECT * INTO v_persistent_equip
    FROM public.athlete_equipment_context
    WHERE user_id = p_user AND scope = 'persistent'
    ORDER BY created_at DESC LIMIT 1;

  IF v_profile.date_of_birth IS NOT NULL THEN
    v_age_years := date_part('year', age(v_profile.date_of_birth));
    v_lifecycle_band := CASE
      WHEN v_age_years < 10 THEN 'foundational'
      WHEN v_age_years < 13 THEN 'pre_adolescent'
      WHEN v_age_years < 16 THEN 'adolescent'
      WHEN v_age_years < 19 THEN 'late_adolescent'
      WHEN v_age_years < 25 THEN 'early_adult'
      WHEN v_age_years < 40 THEN 'adult'
      ELSE 'masters'
    END;
  END IF;

  v_result := jsonb_build_object(
    'sport_primary', jsonb_build_object(
      'value', v_ctx.sport_primary,
      'source', 'athlete_context.sport_primary',
      'confidence', COALESCE(v_ctx.confidence->>'sport_primary', CASE WHEN v_ctx.sport_primary IS NULL THEN 'missing' ELSE 'self_report' END),
      'missing', v_ctx.sport_primary IS NULL,
      'last_updated', v_ctx.updated_at,
      'owner', 'athlete'
    ),
    'goal_summary', jsonb_build_object(
      'value', v_ctx.goal_summary,
      'source', 'athlete_context.goal_summary',
      'confidence', COALESCE(v_ctx.confidence->>'goal_summary', CASE WHEN v_ctx.goal_summary IS NULL THEN 'missing' ELSE 'self_report' END),
      'missing', v_ctx.goal_summary IS NULL,
      'last_updated', v_ctx.updated_at,
      'owner', 'athlete'
    ),
    'goal_horizon', jsonb_build_object(
      'value', v_ctx.goal_horizon,
      'source', 'athlete_context.goal_horizon',
      'confidence', CASE WHEN v_ctx.goal_horizon IS NULL THEN 'missing' ELSE 'self_report' END,
      'missing', v_ctx.goal_horizon IS NULL,
      'last_updated', v_ctx.updated_at,
      'owner', 'athlete'
    ),
    'category_goals', jsonb_build_object(
      'value', v_ctx.category_goals,
      'source', 'athlete_context.category_goals',
      'confidence', CASE WHEN v_ctx.category_goals IS NULL THEN 'missing' ELSE 'self_report' END,
      'missing', v_ctx.category_goals IS NULL,
      'last_updated', v_ctx.updated_at,
      'owner', 'athlete'
    ),
    'weekly_availability_days', jsonb_build_object(
      'value', v_ctx.weekly_availability_days,
      'source', 'athlete_context.weekly_availability_days',
      'confidence', CASE WHEN v_ctx.weekly_availability_days IS NULL THEN 'missing' ELSE 'self_report' END,
      'missing', v_ctx.weekly_availability_days IS NULL,
      'last_updated', v_ctx.updated_at,
      'owner', 'athlete'
    ),
    'weekly_availability_hours', jsonb_build_object(
      'value', v_ctx.weekly_availability_hours,
      'source', 'athlete_context.weekly_availability_hours',
      'confidence', CASE WHEN v_ctx.weekly_availability_hours IS NULL THEN 'missing' ELSE 'self_report' END,
      'missing', v_ctx.weekly_availability_hours IS NULL,
      'last_updated', v_ctx.updated_at,
      'owner', 'athlete'
    ),
    'typical_session_length_min', jsonb_build_object(
      'value', v_ctx.typical_session_length_min,
      'source', 'athlete_context.typical_session_length_min',
      'confidence', CASE WHEN v_ctx.typical_session_length_min IS NULL THEN 'missing' ELSE 'self_report' END,
      'missing', v_ctx.typical_session_length_min IS NULL,
      'last_updated', v_ctx.updated_at,
      'owner', 'athlete'
    ),
    'training_focus', jsonb_build_object(
      'value', to_jsonb(v_ctx.training_focus),
      'source', 'athlete_context.training_focus',
      'confidence', CASE WHEN v_ctx.training_focus IS NULL THEN 'missing' ELSE 'self_report' END,
      'missing', v_ctx.training_focus IS NULL,
      'last_updated', v_ctx.updated_at,
      'owner', 'athlete'
    ),
    'development_priorities', jsonb_build_object(
      'value', to_jsonb(v_ctx.development_priorities),
      'source', 'athlete_context.development_priorities',
      'confidence', CASE WHEN v_ctx.development_priorities IS NULL THEN 'missing' ELSE 'self_report' END,
      'missing', v_ctx.development_priorities IS NULL,
      'last_updated', v_ctx.updated_at,
      'owner', 'athlete'
    ),
    'lifting_age_years', jsonb_build_object(
      'value', v_ctx.lifting_age_years,
      'source', 'athlete_context.lifting_age_years',
      'confidence', CASE WHEN v_ctx.lifting_age_years IS NULL THEN 'missing' ELSE 'self_report' END,
      'missing', v_ctx.lifting_age_years IS NULL,
      'last_updated', v_ctx.updated_at,
      'owner', 'athlete'
    ),
    'years_in_sport', jsonb_build_object(
      'value', v_ctx.years_in_sport,
      'source', 'athlete_context.years_in_sport',
      'confidence', CASE WHEN v_ctx.years_in_sport IS NULL THEN 'missing' ELSE 'self_report' END,
      'missing', v_ctx.years_in_sport IS NULL,
      'last_updated', v_ctx.updated_at,
      'owner', 'athlete'
    ),
    'school_grade', jsonb_build_object(
      'value', v_ctx.school_grade,
      'source', 'athlete_context.school_grade',
      'confidence', CASE WHEN v_ctx.school_grade IS NULL THEN 'missing' ELSE 'self_report' END,
      'missing', v_ctx.school_grade IS NULL,
      'last_updated', v_ctx.updated_at,
      'owner', 'athlete'
    ),
    'season_phase', jsonb_build_object(
      'value', v_ctx.season_phase,
      'source', 'athlete_context.season_phase',
      'confidence', CASE WHEN v_ctx.season_phase IS NULL THEN 'missing' ELSE 'self_report' END,
      'missing', v_ctx.season_phase IS NULL,
      'last_updated', v_ctx.updated_at,
      'owner', 'athlete'
    ),
    'injury_history', jsonb_build_object(
      'value', v_ctx.injury_history,
      'source', 'athlete_context.injury_history',
      'confidence', CASE WHEN v_ctx.injury_history IS NULL OR v_ctx.injury_history = '[]'::jsonb THEN 'missing' ELSE 'self_report' END,
      'missing', v_ctx.injury_history IS NULL OR v_ctx.injury_history = '[]'::jsonb,
      'last_updated', v_ctx.updated_at,
      'owner', 'athlete'
    ),
    'other_sports', jsonb_build_object(
      'value', to_jsonb(v_ctx.other_sports),
      'source', 'athlete_context.other_sports',
      'confidence', CASE WHEN v_ctx.other_sports IS NULL OR array_length(v_ctx.other_sports, 1) IS NULL THEN 'missing' ELSE 'self_report' END,
      'missing', v_ctx.other_sports IS NULL OR array_length(v_ctx.other_sports, 1) IS NULL,
      'last_updated', v_ctx.updated_at,
      'owner', 'athlete'
    ),
    'competition_level', jsonb_build_object(
      'value', v_ctx.competition_level,
      'source', 'athlete_context.competition_level',
      'confidence', CASE WHEN v_ctx.competition_level IS NULL THEN 'missing' ELSE 'self_report' END,
      'missing', v_ctx.competition_level IS NULL,
      'last_updated', v_ctx.updated_at,
      'owner', 'athlete'
    ),
    'education_stage', jsonb_build_object(
      'value', v_ctx.education_stage,
      'source', 'athlete_context.education_stage',
      'confidence', CASE WHEN v_ctx.education_stage IS NULL THEN 'missing' ELSE 'self_report' END,
      'missing', v_ctx.education_stage IS NULL,
      'last_updated', v_ctx.updated_at,
      'owner', 'athlete'
    ),
    'lifting_history', jsonb_build_object(
      'value', v_ctx.lifting_history,
      'source', 'athlete_context.lifting_history',
      'confidence', CASE WHEN v_ctx.lifting_history IS NULL THEN 'missing' ELSE 'self_report' END,
      'missing', v_ctx.lifting_history IS NULL,
      'last_updated', v_ctx.updated_at,
      'owner', 'athlete'
    ),
    'position_primary', jsonb_build_object(
      'value', v_ctx.position_primary,
      'source', 'athlete_context.position_primary',
      'confidence', CASE WHEN v_ctx.position_primary IS NULL THEN 'missing' ELSE 'self_report' END,
      'missing', v_ctx.position_primary IS NULL,
      'last_updated', v_ctx.updated_at,
      'owner', 'athlete'
    ),
    'position_secondary', jsonb_build_object(
      'value', to_jsonb(v_ctx.position_secondary),
      'source', 'athlete_context.position_secondary',
      'confidence', CASE WHEN v_ctx.position_secondary IS NULL OR array_length(v_ctx.position_secondary, 1) IS NULL THEN 'missing' ELSE 'self_report' END,
      'missing', v_ctx.position_secondary IS NULL OR array_length(v_ctx.position_secondary, 1) IS NULL,
      'last_updated', v_ctx.updated_at,
      'owner', 'athlete'
    ),
    'throws_hand', jsonb_build_object(
      'value', v_ctx.throws_hand,
      'source', 'athlete_context.throws_hand',
      'confidence', CASE WHEN v_ctx.throws_hand IS NULL THEN 'missing' ELSE 'self_report' END,
      'missing', v_ctx.throws_hand IS NULL,
      'last_updated', v_ctx.updated_at,
      'owner', 'athlete'
    ),
    'bats_hand', jsonb_build_object(
      'value', v_ctx.bats_hand,
      'source', 'athlete_context.bats_hand',
      'confidence', CASE WHEN v_ctx.bats_hand IS NULL THEN 'missing' ELSE 'self_report' END,
      'missing', v_ctx.bats_hand IS NULL,
      'last_updated', v_ctx.updated_at,
      'owner', 'athlete'
    ),
    'anthropometrics', jsonb_build_object(
      'value', v_ctx.anthropometrics,
      'source', 'athlete_context.anthropometrics',
      'confidence', CASE WHEN v_ctx.anthropometrics IS NULL THEN 'missing' ELSE 'self_report' END,
      'missing', v_ctx.anthropometrics IS NULL,
      'last_updated', v_ctx.updated_at,
      'owner', 'athlete'
    ),
    'equipment_effective', jsonb_build_object(
      'value', to_jsonb(COALESCE(v_session_equip.equipment, v_persistent_equip.equipment)),
      'venue', COALESCE(v_session_equip.venue, v_persistent_equip.venue),
      'scope', CASE WHEN v_session_equip.id IS NOT NULL THEN 'session' WHEN v_persistent_equip.id IS NOT NULL THEN 'persistent' ELSE NULL END,
      'source', COALESCE(v_session_equip.source, v_persistent_equip.source),
      'confidence', COALESCE(v_session_equip.confidence, v_persistent_equip.confidence, 'missing'),
      'missing', v_session_equip.id IS NULL AND v_persistent_equip.id IS NULL,
      'last_updated', COALESCE(v_session_equip.created_at, v_persistent_equip.created_at),
      'owner', 'athlete'
    ),
    'lifecycle_band', jsonb_build_object(
      'value', v_lifecycle_band,
      'age_years', v_age_years,
      'source', 'derived(profiles.date_of_birth)',
      'confidence', CASE WHEN v_lifecycle_band IS NULL THEN 'missing' ELSE 'derived' END,
      'missing', v_lifecycle_band IS NULL,
      'last_updated', v_now,
      'owner', 'derived'
    ),
    'safeguarding_minor', jsonb_build_object(
      'value', CASE WHEN v_profile.date_of_birth IS NULL THEN true ELSE (v_age_years < 18) END,
      'source', 'derived(profiles.date_of_birth)',
      'confidence', CASE WHEN v_profile.date_of_birth IS NULL THEN 'low' ELSE 'high' END,
      'missing', v_profile.date_of_birth IS NULL,
      'last_updated', v_now,
      'owner', 'derived'
    )
  );

  RETURN v_result;
END;
$$;