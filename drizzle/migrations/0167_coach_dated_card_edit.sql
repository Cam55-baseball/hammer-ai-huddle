ALTER TABLE public.custom_activity_templates ADD COLUMN IF NOT EXISTS coach_card_category text NULL;
DO $$ DECLARE def text; BEGIN
 SELECT pg_get_functiondef('public.coach_rx_commit_choice(uuid,uuid,date,text,jsonb,text[],jsonb,timestamptz)'::regprocedure) INTO def;
 IF position('p_date<>current_date' in def)=0 THEN RAISE EXCEPTION 'Canonical date check not found'; END IF;
 def:=replace(def,'p_date<>current_date','(p_date<>current_date AND NOT (p_date>=current_date AND p_safety->>''action''=''coach_day_edit''))');
 EXECUTE def;
 SELECT pg_get_functiondef('public.coach_athlete_week(uuid,date)'::regprocedure) INTO def;
 def:=replace(def,'''dosage_unit'',p.dosage_unit)', '''dosage_unit'',p.dosage_unit,''duration_seconds'',p.duration_seconds,''rest_seconds'',p.rest_seconds,''distance_feet'',p.distance_feet)'); EXECUTE def;
END $$;
CREATE OR REPLACE FUNCTION public.coach_day_edit_commit(p_actor uuid,p_user uuid,p_date date,p_sport text,p_rx uuid,p_title text,p_exercises jsonb,p_rows jsonb,p_safety jsonb,p_template uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r public.coach_prescriptions; result jsonb; cat text; slots text[];
BEGIN
 PERFORM public.wk_lock_plan_day(p_user,p_date);
 IF p_date<current_date OR NOT public.coach_connected_to(p_actor,p_user) THEN RAISE EXCEPTION 'Player or date unavailable'; END IF;
 IF p_sport IS DISTINCT FROM (SELECT sport_primary FROM public.athlete_context WHERE user_id=p_user) THEN RAISE EXCEPTION 'Sport changed; refresh'; END IF;
 IF p_safety->>'action' IS DISTINCT FROM 'coach_day_edit' THEN RAISE EXCEPTION 'Day-edit certification required'; END IF;
 cat:=p_safety->>'category'; slots:=CASE cat WHEN 'lift' THEN ARRAY['lift','supplemental'] WHEN 'warmup' THEN ARRAY['warmup','ub_primer'] WHEN 'vision' THEN ARRAY[]::text[] ELSE ARRAY[cat] END;
 IF EXISTS(SELECT 1 FROM public.wk_session_logs l JOIN public.wk_prescriptions p ON p.id=l.prescription_id WHERE p.user_id=p_user AND p.plan_date=p_date AND p.slot=ANY(slots)) OR EXISTS(SELECT 1 FROM public.hammer_daily_task_completions t WHERE t.user_id=p_user AND t.plan_date=p_date AND t.completed AND (t.task_id IN (SELECT id::text FROM public.wk_prescriptions WHERE user_id=p_user AND plan_date=p_date AND slot=ANY(slots)) OR t.source_ref=CASE cat WHEN 'fielding' THEN 'defense' ELSE cat END)) THEN RAISE EXCEPTION 'Already logged work cannot be replaced'; END IF;
 IF p_template IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.custom_activity_templates WHERE id=p_template AND user_id=p_actor AND deleted_at IS NULL) THEN RAISE EXCEPTION 'Not your template'; END IF;
 IF p_safety->'expected_revision' IS DISTINCT FROM public.coach_rx_safety_revision(p_user,p_date) OR p_safety->'expected_catalog_revision' IS DISTINCT FROM public.coach_rx_catalog_revision() THEN RAISE EXCEPTION 'Safety changed; refresh' USING ERRCODE='40001'; END IF;
 INSERT INTO public.coach_prescriptions(id,sender_id,recipient_id,category,plan_date,title,exercises,gear_labels,source_template_id,status,safety_result,schedule_type) VALUES(p_rx,p_actor,p_user,cat,p_date,p_title,p_exercises,'{}',p_template,'pending',p_safety,'date') RETURNING * INTO r;
 result:=public.coach_rx_commit_certified(p_user,p_rx,p_date,'use_instead',p_rows,slots,p_safety||jsonb_build_object('expected_revision',public.coach_rx_safety_revision(p_user,p_date)),r.updated_at);
 INSERT INTO public.coach_notifications(coach_user_id,sender_user_id,notification_type,title,message,template_snapshot) VALUES(p_user,p_actor,'card_shared',p_title,'Your coach edited your card for '||p_date,jsonb_build_object('coach_rx',p_rx,'date',p_date));
 INSERT INTO public.audit_log(user_id,action,table_name,record_id,metadata) VALUES(p_user,'coach_day_card_edited','coach_prescriptions',p_rx,jsonb_build_object('actor',p_actor,'date',p_date,'before',p_safety->'block_expected','safety',p_safety));
 RETURN result||jsonb_build_object('id',p_rx,'plan_date',p_date);
END $$;
REVOKE ALL ON FUNCTION public.coach_day_edit_commit(uuid,uuid,date,text,uuid,text,jsonb,jsonb,jsonb,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.coach_day_edit_commit(uuid,uuid,date,text,uuid,text,jsonb,jsonb,jsonb,uuid) TO service_role;