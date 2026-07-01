
-- ============================================================
-- Phase 8 — Exercise Governance Registry (additive columns)
-- ============================================================
ALTER TABLE public.wk_movement_catalog
  ADD COLUMN IF NOT EXISTS movement_category text,
  ADD COLUMN IF NOT EXISTS season_legality jsonb,
  ADD COLUMN IF NOT EXISTS training_age_legality jsonb,
  ADD COLUMN IF NOT EXISTS equipment_requirements text[],
  ADD COLUMN IF NOT EXISTS recovery_demand int,
  ADD COLUMN IF NOT EXISTS unilateral boolean,
  ADD COLUMN IF NOT EXISTS rotational boolean,
  ADD COLUMN IF NOT EXISTS eccentric_profile text,
  ADD COLUMN IF NOT EXISTS concentric_profile text,
  ADD COLUMN IF NOT EXISTS elastic_profile text,
  ADD COLUMN IF NOT EXISTS pap_compatible boolean,
  ADD COLUMN IF NOT EXISTS substitution_family text,
  ADD COLUMN IF NOT EXISTS aliases text[],
  ADD COLUMN IF NOT EXISTS governance_version text;

CREATE INDEX IF NOT EXISTS idx_wk_movement_catalog_movement_category
  ON public.wk_movement_catalog (movement_category);
CREATE INDEX IF NOT EXISTS idx_wk_movement_catalog_substitution_family
  ON public.wk_movement_catalog (substitution_family);
CREATE INDEX IF NOT EXISTS idx_wk_movement_catalog_governance_version
  ON public.wk_movement_catalog (governance_version);

-- ---- Backfill: movement_category (exclusive) from existing category/pattern ----
UPDATE public.wk_movement_catalog SET movement_category = CASE
  WHEN category ILIKE 'arm_care%' OR pattern ILIKE 'arm_care%' THEN 'arm_care'
  WHEN category ILIKE 'mobility%' OR pattern ILIKE 'mobility%' THEN 'mobility'
  WHEN category ILIKE 'carry%' OR pattern ILIKE 'carry%' THEN 'carry'
  WHEN category ILIKE 'jump%' OR pattern ILIKE 'jump%' OR pattern ILIKE 'land%' THEN 'jump_landing'
  WHEN pattern ILIKE '%rotation%' AND (pattern ILIKE 'anti%' OR category ILIKE 'anti%') THEN 'anti_rotation'
  WHEN pattern ILIKE '%rotation%' OR category ILIKE '%rotation%' OR bat_compatible = true THEN 'rotation'
  WHEN category ILIKE 'core%' OR pattern ILIKE 'core%' OR pattern ILIKE '%trunk%' THEN 'core'
  WHEN pattern ILIKE '%single_leg%' OR pattern ILIKE '%split%' OR pattern ILIKE '%lunge%' OR pattern ILIKE '%step_up%' THEN 'single_leg'
  WHEN pattern ILIKE '%hinge%' OR pattern ILIKE '%rdl%' OR pattern ILIKE '%deadlift%' OR pattern ILIKE '%good_morning%' OR pattern ILIKE '%nordic%' OR pattern ILIKE '%glute_ham%' THEN 'posterior_chain'
  WHEN pattern ILIKE '%squat%' OR pattern ILIKE '%press_lower%' OR category ILIKE 'lower%' OR category ILIKE 'compound_lower%' THEN 'compound_lower'
  WHEN pattern ILIKE '%push%' OR pattern ILIKE '%press%' OR pattern ILIKE '%bench%' OR category ILIKE '%push%' THEN 'compound_upper_push'
  WHEN pattern ILIKE '%pull%' OR pattern ILIKE '%row%' OR pattern ILIKE '%chin%' OR category ILIKE '%pull%' THEN 'compound_upper_pull'
  WHEN pattern ILIKE '%hip%' THEN 'hip'
  WHEN pattern ILIKE '%shoulder%' THEN 'shoulder'
  WHEN pattern ILIKE '%foot%' OR pattern ILIKE '%ankle%' THEN 'foot_ankle'
  ELSE 'core'
END
WHERE movement_category IS NULL;

-- ---- Backfill: season_legality from phase_allow / season_eligibility / is_eccentric_dominant ----
UPDATE public.wk_movement_catalog SET season_legality = jsonb_build_object(
  'os_q1', COALESCE('offseason' = ANY(phase_allow), true),
  'os_q2', COALESCE('offseason' = ANY(phase_allow), true),
  'os_q3', COALESCE('offseason' = ANY(phase_allow), true),
  'os_q4', COALESCE('offseason' = ANY(phase_allow), true),
  'preseason', COALESCE('preseason' = ANY(phase_allow), NOT COALESCE(is_eccentric_dominant, false)),
  'in_season', COALESCE('in_season' = ANY(phase_allow), NOT COALESCE(is_eccentric_dominant, false)),
  'post_season', COALESCE('post_season' = ANY(phase_allow), true),
  'rtp', false
) WHERE season_legality IS NULL;

-- ---- Backfill: training_age_legality from min_training_age_years ----
UPDATE public.wk_movement_catalog SET training_age_legality = jsonb_build_object(
  'beginner',    COALESCE(min_training_age_years, 0) <= 0.5,
  'developing',  COALESCE(min_training_age_years, 0) <= 1.5,
  'intermediate',COALESCE(min_training_age_years, 0) <= 3,
  'advanced',    COALESCE(min_training_age_years, 0) <= 5,
  'elite',       true,
  'pro',         true
) WHERE training_age_legality IS NULL;

-- ---- Backfill: equipment_requirements from equipment ----
UPDATE public.wk_movement_catalog
   SET equipment_requirements = COALESCE(equipment, ARRAY['bodyweight']::text[])
 WHERE equipment_requirements IS NULL;

-- ---- Backfill: recovery_demand from recovery_cost (clamp 1..5) ----
UPDATE public.wk_movement_catalog
   SET recovery_demand = GREATEST(1, LEAST(5, COALESCE(recovery_cost, 2)))
 WHERE recovery_demand IS NULL;

-- ---- Backfill: unilateral / rotational flags ----
UPDATE public.wk_movement_catalog SET unilateral = (
  pattern ILIKE '%single_leg%' OR pattern ILIKE '%split%' OR pattern ILIKE '%lunge%'
  OR pattern ILIKE '%step_up%' OR pattern ILIKE '%single_arm%'
) WHERE unilateral IS NULL;

UPDATE public.wk_movement_catalog SET rotational = (
  movement_category IN ('rotation','anti_rotation') OR COALESCE(bat_compatible, false)
) WHERE rotational IS NULL;

-- ---- Backfill: force profiles ----
UPDATE public.wk_movement_catalog SET eccentric_profile = CASE
  WHEN is_eccentric_dominant IS TRUE THEN 'high'
  WHEN pattern ILIKE '%squat%' OR pattern ILIKE '%deadlift%' OR pattern ILIKE '%rdl%' THEN 'moderate'
  ELSE 'low'
END WHERE eccentric_profile IS NULL;

UPDATE public.wk_movement_catalog SET concentric_profile = CASE
  WHEN COALESCE(power_emphasis,false) OR intensity_class ILIKE '%power%' THEN 'high'
  WHEN pattern ILIKE '%squat%' OR pattern ILIKE '%press%' OR pattern ILIKE '%deadlift%' THEN 'moderate'
  ELSE 'low'
END WHERE concentric_profile IS NULL;

UPDATE public.wk_movement_catalog SET elastic_profile = CASE
  WHEN COALESCE(elastic_emphasis,false) OR pattern ILIKE '%jump%' OR pattern ILIKE '%bound%' OR pattern ILIKE '%hop%' OR pattern ILIKE '%plyo%' THEN 'high'
  WHEN COALESCE(power_emphasis,false) THEN 'moderate'
  ELSE 'low'
END WHERE elastic_profile IS NULL;

-- ---- Backfill: PAP compatibility ----
UPDATE public.wk_movement_catalog SET pap_compatible = (
  COALESCE(power_emphasis,false) OR COALESCE(elastic_emphasis,false)
  OR intensity_class ILIKE '%power%' OR movement_category = 'jump_landing'
) WHERE pap_compatible IS NULL;

-- ---- Backfill: substitution_family (family → duplicate_group → movement_category) ----
UPDATE public.wk_movement_catalog
   SET substitution_family = COALESCE(family, duplicate_group, movement_category)
 WHERE substitution_family IS NULL;

-- ---- Backfill: aliases (empty array default) ----
UPDATE public.wk_movement_catalog
   SET aliases = ARRAY[]::text[]
 WHERE aliases IS NULL;

-- ---- Governance stamp ----
UPDATE public.wk_movement_catalog SET governance_version = 'gov_v1'
 WHERE governance_version IS NULL
   AND movement_category IS NOT NULL
   AND season_legality IS NOT NULL
   AND training_age_legality IS NOT NULL
   AND equipment_requirements IS NOT NULL
   AND recovery_demand IS NOT NULL
   AND substitution_family IS NOT NULL;

-- ============================================================
-- Phase 8 — Diagnostics extensions
-- ============================================================
ALTER TABLE public.wk_generation_diagnostics
  ADD COLUMN IF NOT EXISTS lift_template_id text,
  ADD COLUMN IF NOT EXISTS lift_category_coverage jsonb,
  ADD COLUMN IF NOT EXISTS lift_full_body_ok boolean,
  ADD COLUMN IF NOT EXISTS lift_duplicate_check_ok boolean,
  ADD COLUMN IF NOT EXISTS lift_substitution_completeness numeric,
  ADD COLUMN IF NOT EXISTS exercise_governance_version text;

-- ============================================================
-- Phase 8 — RPC update to persist new lift diagnostics
-- ============================================================
CREATE OR REPLACE FUNCTION public.wk_persist_prescriptions_atomic(p_user uuid, p_date date, p_rows jsonb, p_diag jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_diag_id uuid;
BEGIN
  IF p_user IS NULL OR p_date IS NULL THEN
    RAISE EXCEPTION 'p_user and p_date are required';
  END IF;

  DELETE FROM public.wk_prescriptions
  WHERE user_id = p_user AND plan_date = p_date;

  IF jsonb_typeof(p_rows) = 'array' AND jsonb_array_length(p_rows) > 0 THEN
    INSERT INTO public.wk_prescriptions (
      user_id, plan_date, phase, slot, sequence_order, sequence_role,
      movement_slug, movement_name, sets, reps, tempo, load_pct,
      cns_cost, cns_clamped, substituted_from_slug, substitution_reason,
      why_payload, rationale, adaptation, engine, why_v2,
      validator_report, generator_version, status
    )
    SELECT
      p_user,
      p_date,
      (r->>'phase'),
      (r->>'slot'),
      (r->>'sequence_order')::int,
      NULLIF(r->>'sequence_role',''),
      (r->>'movement_slug'),
      (r->>'movement_name'),
      NULLIF(r->>'sets','')::int,
      NULLIF(r->>'reps','')::int,
      NULLIF(r->>'tempo',''),
      NULLIF(r->>'load_pct','')::int,
      COALESCE((r->>'cns_cost')::int, 0),
      COALESCE((r->>'cns_clamped')::boolean, false),
      NULLIF(r->>'substituted_from_slug',''),
      NULLIF(r->>'substitution_reason',''),
      COALESCE(r->'why_payload','{}'::jsonb),
      NULLIF(r->>'rationale',''),
      NULLIF(r->>'adaptation',''),
      NULLIF(r->>'engine',''),
      NULLIF(r->'why_v2','null'::jsonb),
      NULLIF(r->'validator_report','null'::jsonb),
      NULLIF(r->>'generator_version',''),
      COALESCE(NULLIF(r->>'status',''), 'planned')
    FROM jsonb_array_elements(p_rows) AS r;
  END IF;

  INSERT INTO public.wk_generation_diagnostics (
    user_id, plan_date, generator_version, season_phase, adaptation,
    generation_ms, validation_status, exercise_count, duplicate_count,
    ordering_ok, metadata_complete, cards_produced, warnings, errors,
    resolved_season_phase, resolved_day_type, context_version,
    legality_profile_id, recovery_profile_id, adaptation_profile_id,
    context_validation_outcome,
    athlete_context_version, personalization_version, training_age_version,
    missing_context_fields, context_completeness_score,
    lift_template_id, lift_category_coverage, lift_full_body_ok,
    lift_duplicate_check_ok, lift_substitution_completeness,
    exercise_governance_version
  ) VALUES (
    p_user,
    p_date,
    COALESCE(p_diag->>'generator_version','unknown'),
    p_diag->>'season_phase',
    p_diag->>'adaptation',
    NULLIF(p_diag->>'generation_ms','')::int,
    COALESCE(p_diag->>'validation_status','published'),
    COALESCE((p_diag->>'exercise_count')::int, 0),
    COALESCE((p_diag->>'duplicate_count')::int, 0),
    COALESCE((p_diag->>'ordering_ok')::boolean, true),
    COALESCE((p_diag->>'metadata_complete')::boolean, true),
    COALESCE(p_diag->'cards_produced','{}'::jsonb),
    COALESCE(p_diag->'warnings','[]'::jsonb),
    COALESCE(p_diag->'errors','[]'::jsonb),
    NULLIF(p_diag->>'resolved_season_phase',''),
    NULLIF(p_diag->>'resolved_day_type',''),
    NULLIF(p_diag->>'context_version',''),
    NULLIF(p_diag->>'legality_profile_id',''),
    NULLIF(p_diag->>'recovery_profile_id',''),
    NULLIF(p_diag->>'adaptation_profile_id',''),
    NULLIF(p_diag->>'context_validation_outcome',''),
    NULLIF(p_diag->>'athlete_context_version',''),
    NULLIF(p_diag->>'personalization_version',''),
    NULLIF(p_diag->>'training_age_version',''),
    CASE WHEN jsonb_typeof(p_diag->'missing_context_fields') = 'array'
         THEN ARRAY(SELECT jsonb_array_elements_text(p_diag->'missing_context_fields'))
         ELSE NULL END,
    NULLIF(p_diag->>'context_completeness_score','')::numeric,
    NULLIF(p_diag->>'lift_template_id',''),
    NULLIF(p_diag->'lift_category_coverage','null'::jsonb),
    NULLIF(p_diag->>'lift_full_body_ok','')::boolean,
    NULLIF(p_diag->>'lift_duplicate_check_ok','')::boolean,
    NULLIF(p_diag->>'lift_substitution_completeness','')::numeric,
    NULLIF(p_diag->>'exercise_governance_version','')
  ) RETURNING id INTO v_diag_id;

  RETURN v_diag_id;
END;
$function$;
