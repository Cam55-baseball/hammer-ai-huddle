CREATE OR REPLACE FUNCTION public.coach_rx_commit_choice(p_user uuid,p_rx uuid,p_date date,p_choice text,p_rows jsonb,p_slots text[],p_safety jsonb,p_expected_updated_at timestamptz) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r public.coach_prescriptions; s public.athlete_plan_snapshots; n integer:=0; inserted integer:=0; b integer; expected jsonb; modality text; allowed text[]; ids jsonb; coachblock jsonb;
BEGIN
 PERFORM public.wk_lock_plan_day(p_user,p_date);
 SELECT * INTO r FROM public.coach_prescriptions WHERE id=p_rx FOR UPDATE;
 IF NOT FOUND OR r.recipient_id<>p_user THEN RAISE EXCEPTION 'Not your prescription' USING ERRCODE='42501'; END IF;
 IF r.cancelled_at IS NOT NULL OR r.status NOT IN ('pending','saved_for_later') OR r.updated_at IS DISTINCT FROM p_expected_updated_at THEN RAISE EXCEPTION 'Workout changed; refresh' USING ERRCODE='40001'; END IF;
 IF p_choice NOT IN ('use_instead','add_alongside','save_for_later','declined') THEN RAISE EXCEPTION 'Invalid choice'; END IF;
 allowed:=CASE r.category WHEN 'lift' THEN ARRAY['lift','supplemental'] WHEN 'warmup' THEN ARRAY['warmup','ub_primer'] WHEN 'vision' THEN ARRAY[]::text[] ELSE ARRAY[r.category] END;
 IF p_slots IS DISTINCT FROM allowed THEN RAISE EXCEPTION 'Wrong category'; END IF;
 IF p_choice IN ('use_instead','add_alongside') THEN
  IF p_safety->>'envelope' IS DISTINCT FROM 'wic-swap' OR p_safety->>'verdict' IS DISTINCT FROM 'allow' THEN RAISE EXCEPTION 'Safety certification required'; END IF;
  IF p_date<>current_date OR jsonb_typeof(p_rows)<>'array' OR jsonb_array_length(p_rows)=0 THEN RAISE EXCEPTION 'Invalid active workout'; END IF;
  IF EXISTS(SELECT 1 FROM jsonb_array_elements(p_rows) e WHERE (e->>'user_id')::uuid IS DISTINCT FROM p_user OR (e->>'plan_date')::date IS DISTINCT FROM p_date OR e->'why_payload'->>'coach_rx' IS DISTINCT FROM p_rx::text OR e->>'slot' IS DISTINCT FROM coalesce(allowed[1],r.category)) THEN RAISE EXCEPTION 'Invalid workout rows'; END IF;
  SELECT * INTO s FROM public.athlete_plan_snapshots WHERE user_id=p_user AND plan_date=p_date AND sport=(SELECT sport_primary FROM public.athlete_context WHERE user_id=p_user) FOR UPDATE;
  IF p_choice='use_instead' THEN
   modality:=CASE r.category WHEN 'fielding' THEN 'defense' ELSE r.category END;
   SELECT ordinality::integer-1 INTO b FROM jsonb_array_elements(coalesce(s.payload->'blocks','[]')) WITH ORDINALITY WHERE value->>'modality'=modality AND value->>'status'='ready' AND value->>'replacedByCoachRx' IS NULL;
   IF b IS NOT NULL THEN
    expected:=p_safety->'block_expected';
    IF expected IS NULL OR expected IS DISTINCT FROM s.payload->'blocks'->b THEN RAISE EXCEPTION 'Plan changed; refresh' USING ERRCODE='40001'; END IF;
    IF EXISTS(SELECT 1 FROM public.hammer_daily_task_completions c CROSS JOIN jsonb_array_elements(coalesce(expected->'drills','[]')) d WHERE c.user_id=p_user AND c.plan_date=p_date AND c.completed AND (c.task_id='block:'||modality||':'||coalesce(nullif(d->>'slug',''),d->>'name') OR c.payload->>'name'=d->>'name')) THEN RAISE EXCEPTION 'Already completed'; END IF;
    s.payload:=jsonb_set(s.payload,ARRAY['blocks',b::text],expected||jsonb_build_object('replacedByCoachRx',p_rx,'replacementLabel','Replaced by coach workout — not missed'));
    n:=1;
   END IF;
   UPDATE public.wk_prescriptions SET status='skipped',replaced_by_coach_rx=p_rx WHERE user_id=p_user AND plan_date=p_date AND slot=ANY(allowed) AND replaced_by_coach_rx IS NULL AND status NOT IN ('completed','skipped');
   IF NOT FOUND AND n=0 THEN RAISE EXCEPTION 'The card changed; refresh' USING ERRCODE='40001'; END IF;
  END IF;
  WITH written AS (
   INSERT INTO public.wk_prescriptions(user_id,plan_date,slot,sequence_order,sequence_role,movement_slug,movement_name,phase,sets,reps,duration_seconds,rest_seconds,distance_feet,total_reps,dosage_unit,cns_cost,cns_clamped,rationale,status,why_payload)
   SELECT user_id,plan_date,slot,sequence_order,sequence_role,movement_slug,movement_name,phase,sets,reps,duration_seconds,rest_seconds,distance_feet,total_reps,dosage_unit,cns_cost,cns_clamped,rationale,status,why_payload FROM jsonb_populate_recordset(NULL::public.wk_prescriptions,p_rows) RETURNING *
  ) SELECT count(*),coalesce(jsonb_agg(jsonb_build_object('name',movement_name,'slug',movement_slug,'prescriptionId',id,'dosage',jsonb_strip_nulls(jsonb_build_object('sets',sets,'reps',reps,'seconds',duration_seconds,'feet',distance_feet,'unit',dosage_unit))::text,'stage','coach','cue',rationale)),'[]') INTO inserted,ids FROM written;
  coachblock:=jsonb_build_object('modality',r.category,'title',r.title,'status','ready','phase',p_rows->0->>'phase','coachRx',p_rx,'because',jsonb_build_array(p_rows->0->>'rationale'),'drills',ids);
  IF s.id IS NOT NULL THEN
   s.payload:=jsonb_set(s.payload,'{blocks}',coalesce(s.payload->'blocks','[]')||jsonb_build_array(coachblock));
   UPDATE public.athlete_plan_snapshots SET payload=s.payload,updated_at=clock_timestamp() WHERE id=s.id;
  END IF;
  UPDATE public.wk_cns_ledger SET units_spent=coalesce((p_safety->>'cns_result')::numeric,units_spent) WHERE user_id=p_user AND ledger_date=p_date;
 END IF;
 UPDATE public.coach_prescriptions SET status=CASE p_choice WHEN 'use_instead' THEN 'used_instead' WHEN 'add_alongside' THEN 'added_alongside' ELSE p_choice END,plan_date=CASE WHEN p_choice IN ('use_instead','add_alongside') THEN p_date ELSE r.plan_date END,safety_result=coalesce(p_safety,r.safety_result),updated_at=now() WHERE id=p_rx;
 RETURN jsonb_build_object('applied',true,'replaced',n,'inserted',inserted);
END $$;
REVOKE ALL ON FUNCTION public.coach_rx_commit_choice(uuid,uuid,date,text,jsonb,text[],jsonb,timestamptz) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.coach_rx_commit_choice(uuid,uuid,date,text,jsonb,text[],jsonb,timestamptz) TO service_role;
CREATE OR REPLACE FUNCTION public.wk_save_block_day(p_date date,p_sport text,p_engine text,p_payload jsonb) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF auth.uid() IS NULL OR p_sport NOT IN ('baseball','softball') THEN RAISE EXCEPTION 'Sign in'; END IF;
 PERFORM public.wk_lock_plan_day(auth.uid(),p_date);
 INSERT INTO public.athlete_plan_snapshots(user_id,plan_date,sport,engine_version,payload) VALUES(auth.uid(),p_date,p_sport,p_engine,p_payload)
 ON CONFLICT(user_id,plan_date,sport) DO UPDATE SET payload=excluded.payload,updated_at=clock_timestamp()
 WHERE NOT EXISTS(SELECT 1 FROM public.swap_log WHERE user_id=auth.uid() AND plan_date=p_date AND prescription_id IS NULL)
 AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(coalesce(athlete_plan_snapshots.payload->'blocks','[]')) b WHERE b->>'coachRx' IS NOT NULL OR b->>'replacedByCoachRx' IS NOT NULL);
END $$;
REVOKE ALL ON FUNCTION public.wk_save_block_day(date,text,text,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.wk_save_block_day(date,text,text,jsonb) TO authenticated;
COMMENT ON FUNCTION public.coach_rx_commit_choice(uuid,uuid,date,text,jsonb,text[],jsonb,timestamptz) IS 'Service-certified coach activation under the existing block/day lock: exact same-category saved block revision, completion guard, canonical rows and snapshot references together; replacement is not missed. Requires WIC/Swap certification. Existing day snapshot saves preserve coach changes.';