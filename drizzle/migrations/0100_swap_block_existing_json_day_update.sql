CREATE OR REPLACE FUNCTION public.wk_swap_block_atomic(p_user uuid,p_date date,p_id uuid,p_sport text,p_modality text,p_index integer,p_expected jsonb,p_replacement jsonb,p_reason text,p_missing text[],p_scope text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE s public.athlete_plan_snapshots; b integer; d jsonb; task text;
BEGIN
 PERFORM public.wk_lock_plan_day(p_user,p_date);
 IF p_scope NOT IN ('today','always') OR p_index<0 OR nullif(trim(p_reason),'') IS NULL THEN RAISE EXCEPTION 'Invalid swap'; END IF;
 SELECT * INTO s FROM public.athlete_plan_snapshots WHERE id=p_id AND user_id=p_user AND plan_date=p_date AND sport=p_sport FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Plan unavailable'; END IF;
 SELECT ordinality::integer-1 INTO b FROM jsonb_array_elements(s.payload->'blocks') WITH ORDINALITY WHERE value->>'modality'=p_modality;
 IF b IS NULL THEN RAISE EXCEPTION 'Block unavailable'; END IF;
 d:=s.payload->'blocks'->b->'drills'->p_index;
 IF d IS NULL OR d<>p_expected OR (s.payload->'blocks'->b->>'status')<>'ready' THEN RAISE EXCEPTION 'Plan changed'; END IF;
 IF p_replacement->>'dosage' IS DISTINCT FROM d->>'dosage' OR p_replacement->>'stage' IS DISTINCT FROM d->>'stage' THEN RAISE EXCEPTION 'Dose or stage changed'; END IF;
 task:='block:'||p_modality||':'||coalesce(nullif(d->>'slug',''),d->>'name');
 IF EXISTS(SELECT 1 FROM public.hammer_daily_task_completions WHERE user_id=p_user AND plan_date=p_date AND (task_id=task OR payload->>'name'=d->>'name') AND completed) THEN RAISE EXCEPTION 'Already completed'; END IF;
 UPDATE public.athlete_plan_snapshots SET payload=jsonb_set(payload,ARRAY['blocks',b::text,'drills',p_index::text],p_replacement),updated_at=clock_timestamp() WHERE id=p_id RETURNING * INTO s;
 INSERT INTO public.swap_log(user_id,plan_date,prescription_id,from_slug,to_slug,reason,missing_items,scope) VALUES(p_user,p_date,null,coalesce(d->>'slug',d->>'name'),p_replacement->>'slug',p_reason,coalesce(p_missing,'{}'),p_scope);
 IF cardinality(coalesce(p_missing,'{}'))>0 THEN INSERT INTO public.athlete_equipment_memory(user_id,request_id,scope,plan_date,confirmed_have,confirmed_lacks) VALUES(p_user,gen_random_uuid(),p_scope,p_date,'{}',p_missing); END IF;
 RETURN jsonb_build_object('saved',s.payload,'memorySaved',cardinality(coalesce(p_missing,'{}'))>0);
END $$;
REVOKE ALL ON FUNCTION public.wk_swap_block_atomic(uuid,date,uuid,text,text,integer,jsonb,jsonb,text,text[],text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.wk_swap_block_atomic(uuid,date,uuid,text,text,integer,jsonb,jsonb,text,text[],text) TO service_role;
CREATE OR REPLACE FUNCTION public.wk_save_block_day(p_date date,p_sport text,p_engine text,p_payload jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF auth.uid() IS NULL OR p_sport NOT IN ('baseball','softball') THEN RAISE EXCEPTION 'Sign in'; END IF;
 PERFORM public.wk_lock_plan_day(auth.uid(),p_date);
 INSERT INTO public.athlete_plan_snapshots(user_id,plan_date,sport,engine_version,payload) VALUES(auth.uid(),p_date,p_sport,p_engine,p_payload)
 ON CONFLICT(user_id,plan_date,sport) DO UPDATE SET payload=excluded.payload,updated_at=clock_timestamp()
 WHERE NOT EXISTS(SELECT 1 FROM public.swap_log WHERE user_id=auth.uid() AND plan_date=p_date AND prescription_id IS NULL);
END $$;
REVOKE ALL ON FUNCTION public.wk_save_block_day(date,text,text,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.wk_save_block_day(date,text,text,jsonb) TO authenticated;