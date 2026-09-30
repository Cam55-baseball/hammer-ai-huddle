CREATE OR REPLACE FUNCTION public.ledger_record(
  p_user uuid, p_source text, p_key text, p_value double precision, p_unit text,
  p_video uuid, p_session uuid, p_source_row text, p_ctx jsonb, p_conf double precision,
  p_floor double precision, p_engine text, p_at timestamptz
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid; v_ctx jsonb := COALESCE(p_ctx,'{}'::jsonb); v_ckey text;
BEGIN
  IF p_user IS NULL OR p_key IS NULL OR p_value IS NULL OR p_value = 'NaN'::double precision
     OR p_value IN ('Infinity'::double precision,'-Infinity'::double precision) THEN RETURN NULL; END IF;
  v_ckey := COALESCE(v_ctx->>'view','any') || '|' || COALESCE(v_ctx->>'side','any');
  BEGIN
    INSERT INTO public.athlete_metric_observations(user_id, video_id, source, metric_key, value, engine_version, recorded_at,
      unit, session_id, source_row_id, capture_context, context_key, confidence, noise_floor)
    VALUES (p_user, p_video, p_source, p_key, p_value, COALESCE(p_engine,'unknown'), COALESCE(p_at, now()),
      p_unit, p_session, p_source_row, v_ctx, v_ckey, p_conf, p_floor)
    ON CONFLICT (user_id, source, source_row_id, metric_key, engine_version) WHERE source_row_id IS NOT NULL
    DO UPDATE SET value = EXCLUDED.value, unit = EXCLUDED.unit, capture_context = EXCLUDED.capture_context,
      context_key = EXCLUDED.context_key, confidence = EXCLUDED.confidence, noise_floor = EXCLUDED.noise_floor,
      recorded_at = EXCLUDED.recorded_at
    WHERE public.athlete_metric_observations.value IS DISTINCT FROM EXCLUDED.value
    RETURNING id INTO v_id;
    IF v_id IS NOT NULL THEN PERFORM public.baseline_recompute(v_id); END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '[ledger] % % failed: %', p_source, p_key, SQLERRM;
    RETURN NULL;
  END;
  RETURN v_id;
END; $$;
REVOKE ALL ON FUNCTION public.ledger_record(uuid,text,text,double precision,text,uuid,uuid,text,jsonb,double precision,double precision,text,timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ledger_record(uuid,text,text,double precision,text,uuid,uuid,text,jsonb,double precision,double precision,text,timestamptz) TO service_role;