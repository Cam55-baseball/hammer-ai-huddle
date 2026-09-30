CREATE OR REPLACE FUNCTION public.ledger_from_videos()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE f record;
BEGIN
  IF NEW.ai_analysis IS NULL THEN RETURN NEW; END IF;
  BEGIN
    FOR f IN SELECT key, value FROM jsonb_each(NEW.ai_analysis) WHERE key LIKE '%\_tiles\_deterministic' LOOP
      IF TG_OP = 'INSERT' OR OLD.ai_analysis IS NULL OR (OLD.ai_analysis->f.key) IS DISTINCT FROM f.value THEN
        PERFORM public.ledger_record_tiles(NEW.id, f.key, f.value);
      END IF;
    END LOOP;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '[ledger] video % not recorded: %', NEW.id, SQLERRM;
  END;
  RETURN NEW;
END; $function$;

CREATE OR REPLACE FUNCTION public.ledger_from_sources()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE k record;
BEGIN
 BEGIN
  IF TG_TABLE_NAME = 'combine_results' THEN
    IF NEW.value IS NOT NULL AND NEW.missing_reason IS NULL THEN
      PERFORM public.ledger_record(NEW.user_id, 'combine', 'combine.' || NEW.event, NEW.value, NEW.unit, NULL, NEW.session_id, NEW.id::text,
        jsonb_build_object('source', NEW.source), NEW.confidence, NULL, 'combine_results', NEW.created_at);
    END IF;
  ELSIF TG_TABLE_NAME = 'baserunning_splits' THEN
    IF NEW.value IS NOT NULL AND NEW.missing_reason IS NULL THEN
      PERFORM public.ledger_record(NEW.user_id, 'baserunning', 'baserunning.' || NEW.event, NEW.value, NEW.unit, NULL, NULL, NEW.id::text,
        jsonb_build_object('side', NEW.batter_hand, 'source', NEW.source), NEW.confidence, NULL, 'baserunning_splits', NEW.created_at);
    END IF;
  ELSIF TG_TABLE_NAME = 'sprint_analyses' THEN
    IF NEW.total_time_sec IS NOT NULL AND COALESCE(NEW.validation_status,'') NOT IN ('rejected','invalid','failed') THEN
      PERFORM public.ledger_record(NEW.user_id, 'sprint', 'sprint.' || COALESCE(NEW.distance_key,'unknown') || '.total_time_sec', NEW.total_time_sec, 'seconds',
        NULL, NEW.session_id, NEW.id::text, jsonb_build_object('source', NEW.ai_model), NEW.confidence_score, NULL, COALESCE(NEW.ai_model,'sprint'), NEW.created_at);
    END IF;
  ELSIF TG_TABLE_NAME = 'delaycam_reps' THEN
    FOR k IN SELECT key, value FROM jsonb_each(COALESCE(NEW.metrics,'{}'::jsonb)) WHERE jsonb_typeof(value) = 'number' LOOP
      PERFORM public.ledger_record(NEW.user_id, 'delaycam', 'delaycam.' || k.key, (k.value #>> '{}')::double precision, NULL, NULL, NEW.session_id,
        NEW.id::text, jsonb_build_object('fps_tier', NEW.fps_tier, 'fps', NEW.fps_measured), NEW.boundary_confidence, NULL,
        COALESCE(NEW.engine_version,'delaycam'), NEW.created_at);
    END LOOP;
  ELSIF TG_TABLE_NAME = 'block_workout_metrics' THEN
    IF NEW.rpe IS NOT NULL THEN
      PERFORM public.ledger_record(NEW.user_id, 'lifting', 'lifting.session_rpe', NEW.rpe, 'rpe', NULL, NEW.workout_id, NEW.id::text,
        '{}'::jsonb, NULL, NULL, 'block_workout_metrics', NEW.created_at);
    END IF;
  ELSIF TG_TABLE_NAME = 'athlete_load_tracking' THEN
    PERFORM public.ledger_record(NEW.user_id, 'workload', 'workload.cns_load_total', NEW.cns_load_total, 'load', NULL, NULL, NEW.id::text, '{}'::jsonb, NULL, NULL, 'athlete_load_tracking', NEW.entry_date::timestamptz);
    PERFORM public.ledger_record(NEW.user_id, 'workload', 'workload.volume_load', NEW.volume_load, 'load', NULL, NULL, NEW.id::text, '{}'::jsonb, NULL, NULL, 'athlete_load_tracking', NEW.entry_date::timestamptz);
    PERFORM public.ledger_record(NEW.user_id, 'workload', 'workload.intensity_avg', NEW.intensity_avg, 'intensity', NULL, NULL, NEW.id::text, '{}'::jsonb, NULL, NULL, 'athlete_load_tracking', NEW.entry_date::timestamptz);
    PERFORM public.ledger_record(NEW.user_id, 'workload', 'workload.recovery_debt', NEW.recovery_debt, 'load', NULL, NULL, NEW.id::text, '{}'::jsonb, NULL, NULL, 'athlete_load_tracking', NEW.entry_date::timestamptz);
  ELSIF TG_TABLE_NAME = 'athlete_daily_log' THEN
    PERFORM public.ledger_record(NEW.user_id, 'workload', 'workload.cns_load_actual', NEW.cns_load_actual, 'load', NULL, NULL, NEW.id::text, '{}'::jsonb, NULL, NULL, 'athlete_daily_log', NEW.entry_date::timestamptz);
  ELSIF TG_TABLE_NAME = 'hie_snapshots' THEN
    PERFORM public.ledger_record(NEW.user_id, 'readiness', 'readiness.readiness_score', NEW.readiness_score, 'score', NULL, NULL, NEW.id::text, '{}'::jsonb, NULL, NULL, 'hie_snapshots', NEW.computed_at);
    PERFORM public.ledger_record(NEW.user_id, 'readiness', 'readiness.training_readiness_score', NEW.training_readiness_score, 'score', NULL, NULL, NEW.id::text, '{}'::jsonb, NULL, NULL, 'hie_snapshots', NEW.computed_at);
  END IF;
 EXCEPTION WHEN OTHERS THEN
  RAISE WARNING '[ledger] % row % not recorded: %', TG_TABLE_NAME, NEW.id, SQLERRM;
 END;
 RETURN NEW;
END; $function$;