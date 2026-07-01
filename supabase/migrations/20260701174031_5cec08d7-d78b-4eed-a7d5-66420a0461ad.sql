
ALTER TABLE public.wk_generation_diagnostics
  ADD COLUMN IF NOT EXISTS athlete_context_version text,
  ADD COLUMN IF NOT EXISTS personalization_version text,
  ADD COLUMN IF NOT EXISTS training_age_version text,
  ADD COLUMN IF NOT EXISTS missing_context_fields text[],
  ADD COLUMN IF NOT EXISTS context_completeness_score numeric;

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
    missing_context_fields, context_completeness_score
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
    NULLIF(p_diag->>'context_completeness_score','')::numeric
  ) RETURNING id INTO v_diag_id;

  RETURN v_diag_id;
END;
$function$;
