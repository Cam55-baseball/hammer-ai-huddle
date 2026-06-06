
-- ============================================================
-- Athlete Context Spine — P0-1 implementation
-- Constitutional reference: docs/asb/athlete-context-spine-constitution.md
-- ============================================================

-- 1. athlete_context (Minimum Context Set)
CREATE TABLE public.athlete_context (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  sport_primary text,
  sport_secondary text[],
  goal_summary text,
  goal_horizon text,
  goal_priority_rank int,
  weekly_availability_days int,
  weekly_availability_hours numeric,
  typical_session_length_min int,
  training_focus text[],
  development_priorities text[],
  lifting_age_years numeric,
  years_in_sport numeric,
  school_grade text,
  season_phase text,
  injury_history jsonb DEFAULT '[]'::jsonb,
  confidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_authored_at timestamptz,
  last_authored_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.athlete_context TO authenticated;
GRANT ALL ON public.athlete_context TO service_role;

ALTER TABLE public.athlete_context ENABLE ROW LEVEL SECURITY;

CREATE POLICY "athletes manage own context"
  ON public.athlete_context FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "admins read all context"
  ON public.athlete_context FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_athlete_context_updated_at
  BEFORE UPDATE ON public.athlete_context
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. athlete_equipment_context
CREATE TABLE public.athlete_equipment_context (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scope text NOT NULL CHECK (scope IN ('persistent','session','temporary','inferred')),
  equipment text[] NOT NULL DEFAULT '{}',
  venue text,
  valid_until timestamptz,
  source text NOT NULL,
  confidence text NOT NULL DEFAULT 'self_report',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX ux_equipment_singleton ON public.athlete_equipment_context (user_id, scope)
  WHERE scope IN ('persistent','session');

CREATE INDEX ix_equipment_user_scope ON public.athlete_equipment_context (user_id, scope, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.athlete_equipment_context TO authenticated;
GRANT ALL ON public.athlete_equipment_context TO service_role;

ALTER TABLE public.athlete_equipment_context ENABLE ROW LEVEL SECURITY;

CREATE POLICY "athletes manage own equipment context"
  ON public.athlete_equipment_context FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 3. athlete_development_history_events (append-only)
CREATE TABLE public.athlete_development_history_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN (
    'lifting_age_attestation',
    'training_age_attestation',
    'detraining_period',
    'injury_interruption',
    'sport_transition',
    'coaching_change',
    'growth_spurt',
    'developmental_milestone'
  )),
  event_date date NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  source text NOT NULL,
  confidence text NOT NULL DEFAULT 'self_report',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ix_dev_history_user_type_date
  ON public.athlete_development_history_events (user_id, event_type, event_date DESC);

GRANT SELECT, INSERT ON public.athlete_development_history_events TO authenticated;
GRANT ALL ON public.athlete_development_history_events TO service_role;

ALTER TABLE public.athlete_development_history_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "athletes read own development history"
  ON public.athlete_development_history_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "athletes insert own development history"
  ON public.athlete_development_history_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Append-only enforcement: block UPDATE/DELETE by authenticated role
-- (no UPDATE/DELETE policy means no row passes RLS for those operations)

-- 4. Envelope accessor
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
  -- AuthZ
  IF auth.uid() IS NULL OR (auth.uid() <> p_user AND NOT public.has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_ctx FROM public.athlete_context WHERE user_id = p_user;

  SELECT date_of_birth, first_name, last_name, sex, position, experience_level
    INTO v_profile
    FROM public.profiles WHERE id = p_user;

  -- Equipment resolution (session > persistent)
  SELECT * INTO v_session_equip
    FROM public.athlete_equipment_context
    WHERE user_id = p_user
      AND scope = 'session'
      AND (valid_until IS NULL OR valid_until > v_now)
    ORDER BY created_at DESC LIMIT 1;

  SELECT * INTO v_persistent_equip
    FROM public.athlete_equipment_context
    WHERE user_id = p_user AND scope = 'persistent'
    ORDER BY created_at DESC LIMIT 1;

  -- Lifecycle band from DOB (Phase 154 matrix)
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

GRANT EXECUTE ON FUNCTION public.get_athlete_context_envelope(uuid) TO authenticated, service_role;
