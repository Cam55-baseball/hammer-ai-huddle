-- PENDING named owner authorization. No new storage or prescription writer.
CREATE OR REPLACE FUNCTION public.wk_commit_composed_day(
 p_user uuid,p_date date,p_sport text,p_engine text,p_payload jsonb,
 p_expected_rows jsonb,p_expected_snapshot timestamptz,
 p_rows jsonb,p_diag jsonb,p_shared jsonb,p_replace_slots text[],
 p_reason_code text,p_reason_text text,p_detail jsonb
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE current_rows jsonb; current_snapshot timestamptz; result jsonb; diag uuid;
BEGIN
 IF auth.role() IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'Server-certified commit only'; END IF;
 IF p_user IS NULL OR p_date IS NULL OR p_sport NOT IN ('baseball','softball')
  OR p_payload->>'sport' IS DISTINCT FROM p_sport OR p_payload->>'plan_date' IS DISTINCT FROM p_date::text
  OR p_payload->>'composition_version' IS DISTINCT FROM 'sport_physical_v1'
  OR jsonb_typeof(p_payload->'blocks') IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Invalid composed day'; END IF;
 PERFORM public.wk_lock_plan_day(p_user,p_date);
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',id,'status',status,'phase',phase,'slot',slot,'movement_slug',movement_slug,'sets',sets,'reps',reps,'duration_seconds',duration_seconds,'distance_feet',distance_feet,'total_reps',total_reps) ORDER BY id),'[]')
 INTO current_rows FROM public.wk_prescriptions WHERE user_id=p_user AND plan_date=p_date;
 IF current_rows IS DISTINCT FROM p_expected_rows THEN RAISE EXCEPTION 'Day changed; rebuild from fresh saved work'; END IF;
 SELECT updated_at INTO current_snapshot FROM public.athlete_plan_snapshots WHERE user_id=p_user AND plan_date=p_date AND sport=p_sport;
 IF current_snapshot IS DISTINCT FROM p_expected_snapshot THEN RAISE EXCEPTION 'Sport day changed; rebuild from fresh saved work'; END IF;
 IF EXISTS(SELECT 1 FROM public.wk_prescriptions WHERE user_id=p_user AND plan_date=p_date AND status NOT IN ('planned','pending'))
 OR EXISTS(SELECT 1 FROM public.hammer_daily_task_completions WHERE user_id=p_user AND plan_date=p_date AND completed)
 OR EXISTS(SELECT 1 FROM public.swap_log WHERE user_id=p_user AND plan_date=p_date AND prescription_id IS NULL)
 OR EXISTS(SELECT 1 FROM public.athlete_plan_snapshots s,LATERAL jsonb_array_elements(coalesce(s.payload->'blocks','[]')) b WHERE s.user_id=p_user AND s.plan_date=p_date AND (b->>'coachRx' IS NOT NULL OR b->>'replacedByCoachRx' IS NOT NULL))
 THEN RAISE EXCEPTION 'Saved chosen or marked work is protected; no whole-day replacement'; END IF;
 IF jsonb_array_length(current_rows)>0 THEN
  result:=public.wk_adjust_prescriptions_atomic(p_user,p_date,p_rows,p_replace_slots,p_reason_code,p_reason_text,p_detail);
 ELSE
  diag:=public.wk_persist_prescriptions_shared(p_user,p_date,p_rows,p_diag,p_shared);
  result:=jsonb_build_object('diagnostics_id',diag);
 END IF;
 INSERT INTO public.athlete_plan_snapshots(user_id,plan_date,sport,engine_version,payload)
 VALUES(p_user,p_date,p_sport,p_engine,p_payload)
 ON CONFLICT(user_id,plan_date,sport) DO UPDATE SET engine_version=excluded.engine_version,payload=excluded.payload,updated_at=clock_timestamp();
 RETURN result||jsonb_build_object('composed',true,'plan_date',p_date,'sport',p_sport);
END $$;
REVOKE ALL ON FUNCTION public.wk_commit_composed_day(uuid,date,text,text,jsonb,jsonb,timestamptz,jsonb,jsonb,jsonb,text[],text,text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.wk_commit_composed_day(uuid,date,text,text,jsonb,jsonb,timestamptz,jsonb,jsonb,jsonb,text[],text,text,jsonb) TO service_role;