
-- Phase 9 — Explosive Performance Engine governance (Speed + Bat Speed)
-- Additive-only. No existing columns are modified.

ALTER TABLE public.wk_movement_catalog
  ADD COLUMN IF NOT EXISTS speed_category text,
  ADD COLUMN IF NOT EXISTS bat_speed_category text,
  ADD COLUMN IF NOT EXISTS speed_adaptation text,
  ADD COLUMN IF NOT EXISTS bat_speed_adaptation text,
  ADD COLUMN IF NOT EXISTS game_day_legal boolean,
  ADD COLUMN IF NOT EXISTS practice_day_legal boolean,
  ADD COLUMN IF NOT EXISTS pap_classification text,
  ADD COLUMN IF NOT EXISTS movement_velocity text,
  ADD COLUMN IF NOT EXISTS transfer_group text;

-- Backfill: only speed / bat_speed catalog rows and their obvious neighbours.
UPDATE public.wk_movement_catalog
SET
  speed_category = CASE
    WHEN slug ILIKE '%accel%' OR slug ILIKE '%sled%' OR slug ILIKE '%push_start%' THEN 'acceleration'
    WHEN slug ILIKE '%fly%' OR slug ILIKE '%wicket%' OR slug ILIKE '%top_speed%' OR slug ILIKE '%max_velocity%' THEN 'top_speed'
    WHEN slug ILIKE '%bound%' OR slug ILIKE '%pogo%' OR slug ILIKE '%hop%' THEN 'elastic'
    WHEN slug ILIKE '%overspeed%' OR slug ILIKE '%downhill%' OR slug ILIKE '%assist%' THEN 'overspeed'
    WHEN slug ILIKE '%resist%' OR slug ILIKE '%chute%' OR slug ILIKE '%hill%' THEN 'resisted'
    WHEN slug ILIKE '%reactive%' OR slug ILIKE '%ladder%' OR slug ILIKE '%mirror%' THEN 'reactive'
    WHEN slug ILIKE '%decel%' OR slug ILIKE '%stop%' THEN 'deceleration'
    WHEN slug ILIKE '%cod%' OR slug ILIKE '%cut%' OR slug ILIKE '%change_of_direction%' THEN 'change_of_direction'
    WHEN slug ILIKE '%plyo%' OR slug ILIKE '%jump%' THEN 'plyometric'
    WHEN slug ILIKE '%tempo%' OR slug ILIKE '%mobility%' THEN 'mobility'
    ELSE 'acceleration'
  END,
  speed_adaptation = CASE
    WHEN slug ILIKE '%tempo%' OR slug ILIKE '%recovery%' THEN 'recovery'
    WHEN slug ILIKE '%fly%' OR slug ILIKE '%top_speed%' THEN 'top_speed'
    ELSE 'acceleration'
  END,
  pap_classification = CASE
    WHEN slug ILIKE '%sled%' OR slug ILIKE '%resist%' THEN 'heavy'
    WHEN slug ILIKE '%bound%' OR slug ILIKE '%pogo%' OR slug ILIKE '%plyo%' THEN 'moderate'
    ELSE 'light'
  END,
  movement_velocity = CASE
    WHEN slug ILIKE '%overspeed%' OR slug ILIKE '%fly%' THEN 'supra_maximal'
    WHEN slug ILIKE '%accel%' OR slug ILIKE '%sled%' THEN 'maximal'
    WHEN slug ILIKE '%tempo%' THEN 'sub_maximal'
    ELSE 'maximal'
  END,
  transfer_group = 'sprint'
WHERE category = 'speed';

UPDATE public.wk_movement_catalog
SET
  bat_speed_category = CASE
    WHEN slug ILIKE '%heavy_bat%' OR slug ILIKE '%overload%' OR slug ILIKE '%heavy_ball%' THEN 'overload'
    WHEN slug ILIKE '%light_bat%' OR slug ILIKE '%underload%' OR slug ILIKE '%whiffle%' THEN 'underload'
    WHEN slug ILIKE '%band%' OR slug ILIKE '%elastic%' THEN 'elastic_rotation'
    WHEN slug ILIKE '%med_ball%' OR slug ILIKE '%medball%' THEN 'med_ball'
    WHEN slug ILIKE '%pvc%' OR slug ILIKE '%dowel%' THEN 'pvc'
    WHEN slug ILIKE '%rotational_strength%' OR slug ILIKE '%cable_rot%' THEN 'rotational_strength'
    WHEN slug ILIKE '%recovery%' OR slug ILIKE '%mobility%' THEN 'recovery_swing'
    ELSE 'elastic_rotation'
  END,
  bat_speed_adaptation = CASE
    WHEN slug ILIKE '%overload%' OR slug ILIKE '%heavy%' THEN 'overload'
    WHEN slug ILIKE '%underload%' OR slug ILIKE '%light%' THEN 'underload'
    WHEN slug ILIKE '%recovery%' OR slug ILIKE '%mobility%' THEN 'recovery'
    ELSE 'max_bat_speed'
  END,
  pap_classification = COALESCE(pap_classification, CASE
    WHEN slug ILIKE '%overload%' OR slug ILIKE '%heavy%' THEN 'heavy'
    WHEN slug ILIKE '%med_ball%' THEN 'moderate'
    ELSE 'light'
  END),
  movement_velocity = COALESCE(movement_velocity, CASE
    WHEN slug ILIKE '%underload%' OR slug ILIKE '%light%' THEN 'supra_maximal'
    ELSE 'maximal'
  END),
  transfer_group = 'rotational'
WHERE category = 'bat_speed';

-- Global defaults for legality booleans across the whole catalog so validators
-- see explicit values rather than NULL for legacy rows.
UPDATE public.wk_movement_catalog
SET game_day_legal = COALESCE(game_day_legal, COALESCE(game_day_eligible, category IN ('speed','bat_speed','recovery','arm_care','mobility'))),
    practice_day_legal = COALESCE(practice_day_legal, true);

-- Diagnostics extensions for Phase 9.
ALTER TABLE public.wk_generation_diagnostics
  ADD COLUMN IF NOT EXISTS speed_template_id text,
  ADD COLUMN IF NOT EXISTS speed_category_coverage jsonb,
  ADD COLUMN IF NOT EXISTS speed_pap_score numeric,
  ADD COLUMN IF NOT EXISTS speed_substitution_completeness numeric,
  ADD COLUMN IF NOT EXISTS speed_validation_status text,
  ADD COLUMN IF NOT EXISTS bat_speed_template_id text,
  ADD COLUMN IF NOT EXISTS bat_speed_category_coverage jsonb,
  ADD COLUMN IF NOT EXISTS bat_speed_pap_score numeric,
  ADD COLUMN IF NOT EXISTS bat_speed_substitution_completeness numeric,
  ADD COLUMN IF NOT EXISTS bat_speed_validation_status text,
  ADD COLUMN IF NOT EXISTS explosive_governance_version text;

-- RPC upgrade — persist Phase 9 fields.
CREATE OR REPLACE FUNCTION public.wk_persist_prescriptions_atomic(
  p_user uuid, p_date date, p_rows jsonb, p_diag jsonb
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
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
      p_user, p_date,
      (r->>'phase'), (r->>'slot'),
      (r->>'sequence_order')::int, NULLIF(r->>'sequence_role',''),
      (r->>'movement_slug'), (r->>'movement_name'),
      NULLIF(r->>'sets','')::int, NULLIF(r->>'reps','')::int,
      NULLIF(r->>'tempo',''), NULLIF(r->>'load_pct','')::int,
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
    exercise_governance_version,
    speed_template_id, speed_category_coverage, speed_pap_score,
    speed_substitution_completeness, speed_validation_status,
    bat_speed_template_id, bat_speed_category_coverage, bat_speed_pap_score,
    bat_speed_substitution_completeness, bat_speed_validation_status,
    explosive_governance_version
  ) VALUES (
    p_user, p_date,
    COALESCE(p_diag->>'generator_version','unknown'),
    p_diag->>'season_phase', p_diag->>'adaptation',
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
    NULLIF(p_diag->>'exercise_governance_version',''),
    NULLIF(p_diag->>'speed_template_id',''),
    NULLIF(p_diag->'speed_category_coverage','null'::jsonb),
    NULLIF(p_diag->>'speed_pap_score','')::numeric,
    NULLIF(p_diag->>'speed_substitution_completeness','')::numeric,
    NULLIF(p_diag->>'speed_validation_status',''),
    NULLIF(p_diag->>'bat_speed_template_id',''),
    NULLIF(p_diag->'bat_speed_category_coverage','null'::jsonb),
    NULLIF(p_diag->>'bat_speed_pap_score','')::numeric,
    NULLIF(p_diag->>'bat_speed_substitution_completeness','')::numeric,
    NULLIF(p_diag->>'bat_speed_validation_status',''),
    NULLIF(p_diag->>'explosive_governance_version','')
  ) RETURNING id INTO v_diag_id;

  RETURN v_diag_id;
END;
$function$;
