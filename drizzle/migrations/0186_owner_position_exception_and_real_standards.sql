CREATE OR REPLACE FUNCTION public.initial_plan_missing(p_user uuid DEFAULT auth.uid())
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE c jsonb; p jsonb; m jsonb; a jsonb; n jsonb; h jsonb; ps jsonb; pitches boolean; started boolean; has_program boolean; out_items jsonb := '[]'; k text; lbl text; dest text; pairs text[]:=ARRAY['birthday','sport','position','level','goals','ranking','season','equipment','assessment','bats','throws','height','weight','sleep','lifting','season_dates','calorie_goal','protein_goal','carbs_goal','fats_goal','hydration_goal','health','pitcher_focus','pitching_role','starting_point']; missing boolean;
BEGIN
 IF p_user IS NULL OR (auth.uid() IS DISTINCT FROM p_user AND coalesce(auth.role(),'') <> 'service_role') THEN RAISE EXCEPTION 'Not authorized' USING ERRCODE='42501'; END IF;
 SELECT to_jsonb(x) INTO p FROM public.profiles x WHERE id=p_user;
 SELECT to_jsonb(x) INTO c FROM public.athlete_context x WHERE user_id=p_user;
 SELECT to_jsonb(x) INTO m FROM public.athlete_mpi_settings x WHERE user_id=p_user;
 SELECT to_jsonb(x) INTO a FROM public.initial_assessments x WHERE user_id=p_user;
 SELECT to_jsonb(x) INTO n FROM public.vault_nutrition_goals x WHERE user_id=p_user;
 SELECT to_jsonb(x) INTO h FROM public.physio_health_profiles x WHERE user_id=p_user;
 SELECT to_jsonb(x) INTO ps FROM public.pitcher_schedule_settings x WHERE user_id=p_user;
 -- Owner Nov 2 #6: exactly one account (owner Cam Williams) is a position player, never asked pitcher questions.
 pitches := p_user <> '95de827d-7418-460b-8b79-267bf79bdca4'::uuid AND (coalesce(ps->>'primary_focus','')='pitcher' OR EXISTS(SELECT 1 FROM public.subscriptions s WHERE s.user_id=p_user AND s.status IN ('active','trialing') AND EXISTS(SELECT 1 FROM unnest(s.subscribed_modules) mod WHERE mod ~ '(pitching|pitcher|golden2way)')));
 started := (p->>'hammers_today_started_at') IS NOT NULL;
 has_program := EXISTS(SELECT 1 FROM public.subscriptions s WHERE s.user_id=p_user AND s.status IN ('active','trialing') AND EXISTS(SELECT 1 FROM unnest(s.subscribed_modules) mod WHERE mod IN (coalesce(c->>'sport_primary','')||'_pitcher', coalesce(c->>'sport_primary','')||'_5tool', coalesce(c->>'sport_primary','')||'_golden2way')));
 FOREACH k IN ARRAY pairs LOOP
 dest := '/assessment?review=profile'; missing:=false;
 CASE k
 WHEN 'birthday' THEN lbl:='Your birthday'; dest:='/signup'; missing:=p->>'date_of_birth' IS NULL;
 WHEN 'sport' THEN lbl:='Your sport'; dest:='/signup'; missing:=coalesce(c->>'sport_primary','') NOT IN ('baseball','softball');
 WHEN 'position' THEN lbl:='Your position'; missing:=coalesce(btrim(c->>'position_primary'),'')='';
 WHEN 'level' THEN lbl:='Your level of play'; missing:=coalesce(btrim(c->>'competition_level'),'')='';
 WHEN 'goals' THEN lbl:='Your goals'; missing:=coalesce(c->'category_goals','null'::jsonb) IN ('null'::jsonb,'{}'::jsonb,'[]'::jsonb);
 WHEN 'ranking' THEN lbl:='Rank your goals'; missing:=coalesce(jsonb_array_length(CASE WHEN jsonb_typeof(c->'category_goals'->'categoryOrder')='array' THEN c->'category_goals'->'categoryOrder' ELSE '[]'::jsonb END),0)=0;
 WHEN 'season' THEN lbl:='Your season phase'; missing:=coalesce(m->>'season_status','') NOT IN ('off_season','preseason','in_season','post_season') AND coalesce(c->>'season_phase','') NOT IN ('off','pre','in','post'); -- Nov 3: the same saved season answer counts wherever it was written
  WHEN 'equipment' THEN lbl:='Your equipment (bodyweight is an answer)'; missing:=NOT EXISTS(SELECT 1 FROM public.athlete_equipment_context WHERE user_id=p_user AND scope='persistent' AND cardinality(equipment)>0);
 WHEN 'assessment' THEN lbl:='Finish your starting assessment'; dest:='/assessment'; missing:=a->>'completed_at' IS NULL;
 WHEN 'bats' THEN lbl:='Which side you bat from'; missing:=coalesce(c->>'bats_hand','') NOT IN ('L','R','S');
 WHEN 'throws' THEN lbl:='Which hand you throw with'; missing:=coalesce(c->>'throws_hand','') NOT IN ('L','R','S');
 WHEN 'height' THEN lbl:='Your height'; missing:=jsonb_typeof(c->'anthropometrics'->'height_in') IS DISTINCT FROM 'number' OR NOT coalesce((c->'anthropometrics'->>'height_in')::numeric>0,false);
 WHEN 'weight' THEN lbl:='Your weight'; missing:=jsonb_typeof(c->'anthropometrics'->'weight_lb') IS DISTINCT FROM 'number' OR NOT coalesce((c->'anthropometrics'->>'weight_lb')::numeric>0,false);
 WHEN 'sleep' THEN lbl:='Usual sleep (hours a night)'; missing:=jsonb_typeof(c->'sleep_target_hrs') IS DISTINCT FROM 'number' OR NOT coalesce((c->>'sleep_target_hrs')::numeric>0,false);
 WHEN 'lifting' THEN lbl:='Years of lifting (0 if never)'; missing:=jsonb_typeof(c->'lifting_age_years') IS DISTINCT FROM 'number' OR NOT coalesce((c->>'lifting_age_years')::numeric>=0,false);
 WHEN 'season_dates' THEN lbl:='Review your season dates (or say not known yet)'; missing:=NOT coalesce((a->'initial_input_answers'->>'season_dates_reviewed')::boolean,false);
 WHEN 'pitcher_focus' THEN lbl:='Mainly a pitcher or a position player'; missing:=pitches AND coalesce(ps->>'primary_focus','') NOT IN ('pitcher','position');
 WHEN 'pitching_role' THEN lbl:='Your pitching role (Starter, Bullpen arm or Closer)'; missing:=pitches AND coalesce(ps->>'pitching_role','') NOT IN ('starter','bullpen','closer');
 WHEN 'starting_point' THEN lbl:='Where are you starting from?'; missing:=NOT started AND has_program AND NOT EXISTS(SELECT 1 FROM public.athlete_starting_points sp WHERE sp.user_id=p_user AND sp.sport=c->>'sport_primary' AND sp.answers ? 'last_trained');
 WHEN 'health' THEN lbl:='Your health & physio setup'; missing:=NOT coalesce((h->>'setup_completed')::boolean,false);
 ELSE
 lbl:=CASE k WHEN 'calorie_goal' THEN 'Daily calories (kcal)' WHEN 'protein_goal' THEN 'Protein (g)' WHEN 'carbs_goal' THEN 'Carbohydrates (g)' WHEN 'fats_goal' THEN 'Fat (g)' ELSE 'Water (oz)' END;
 missing:=jsonb_typeof(n->k) IS DISTINCT FROM 'number' OR NOT coalesce((n->>k)::numeric>=0,false);
 END CASE;
 IF missing THEN out_items:=out_items||jsonb_build_array(jsonb_build_object('key',k,'label',lbl,'to',dest)); END IF;
 END LOOP;
 RETURN out_items;
END $function$;

-- Owner Nov 3 #12: Coaching Console Standards conversation applies to REAL settings after a double confirm.
-- Same validation as the TEST path; exact old -> new receipt; one-tap Undo. Fields without a real setting are refused.
CREATE OR REPLACE FUNCTION public.philosophy_real_setting(p_target text, p_id text, p_field text, p_write boolean DEFAULT false, p_value jsonb DEFAULT NULL::jsonb)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE r jsonb; arr text[];
BEGIN
 IF NOT public.has_role(auth.uid(),'owner') THEN RAISE EXCEPTION 'Owner only' USING ERRCODE='42501'; END IF;
 IF p_target='mastery_identity_settings' AND p_field IN ('elite_grade','pitching_standards') THEN SELECT to_jsonb(s) INTO r FROM public.mastery_identity_settings s WHERE sport=p_id FOR UPDATE;
 ELSIF p_target='library_videos' AND p_field='tags' THEN SELECT to_jsonb(s) INTO r FROM public.library_videos s WHERE id=p_id::uuid FOR UPDATE;
 ELSIF p_target='owner_drills' AND p_field IN ('fault_keys','placements','routine_role') THEN SELECT to_jsonb(s) INTO r FROM public.owner_drills s WHERE id=p_id::uuid FOR UPDATE;
 ELSIF p_target='engine_dynamic_weights' AND p_field='weight' THEN SELECT to_jsonb(s) INTO r FROM public.engine_dynamic_weights s WHERE axis=p_id FOR UPDATE;
 ELSE RAISE EXCEPTION 'This setting has no real-player version yet'; END IF;
 IF r IS NULL THEN RAISE EXCEPTION 'Existing setting not found'; END IF;
 IF p_write THEN
  IF jsonb_typeof(p_value)='array' THEN arr:=ARRAY(SELECT jsonb_array_elements_text(p_value)); END IF;
  IF p_target='mastery_identity_settings' AND p_field='elite_grade' THEN UPDATE public.mastery_identity_settings SET elite_grade=(p_value#>>'{}')::integer WHERE sport=p_id;
  ELSIF p_target='mastery_identity_settings' THEN UPDATE public.mastery_identity_settings SET pitching_standards=p_value WHERE sport=p_id;
  ELSIF p_target='library_videos' THEN UPDATE public.library_videos SET tags=arr WHERE id=p_id::uuid;
  ELSIF p_target='owner_drills' AND p_field='fault_keys' THEN UPDATE public.owner_drills SET fault_keys=arr WHERE id=p_id::uuid;
  ELSIF p_target='owner_drills' AND p_field='placements' THEN UPDATE public.owner_drills SET placements=arr WHERE id=p_id::uuid;
  ELSIF p_target='owner_drills' THEN UPDATE public.owner_drills SET routine_role=p_value#>>'{}' WHERE id=p_id::uuid;
  ELSE UPDATE public.engine_dynamic_weights SET weight=(p_value#>>'{}')::numeric WHERE axis=p_id; END IF;
  RETURN jsonb_build_object('value',p_value);
 END IF;
 RETURN jsonb_build_object('value',coalesce(r->p_field,'null'::jsonb));
END $function$;

CREATE OR REPLACE FUNCTION public.owner_review_real_setting(p_target text, p_id text, p_field text)
 RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path TO 'public'
AS $function$ SELECT public.philosophy_real_setting(p_target,p_id,p_field); $function$;

CREATE OR REPLACE FUNCTION public.owner_confirm_real_settings(p_thread uuid, p_body text, p_sport text, p_area text, p_changes jsonb)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE ch jsonb; old jsonb; changes jsonb:='[]'; pid uuid; receipt jsonb; pair record;
BEGIN
 IF NOT public.has_role(auth.uid(),'owner') THEN RAISE EXCEPTION 'Owner only' USING ERRCODE='42501'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.recall_threads WHERE id=p_thread AND user_id=auth.uid()) THEN RAISE EXCEPTION 'Conversation not found'; END IF;
 IF p_sport NOT IN ('baseball','softball') OR p_area NOT IN ('hitting','pitching','throwing','fielding','baserunning') OR coalesce(length(trim(p_body)),0)=0 OR length(p_body)>4000 OR jsonb_typeof(p_changes) IS DISTINCT FROM 'array' OR jsonb_array_length(p_changes) NOT BETWEEN 1 AND 12 THEN RAISE EXCEPTION 'Invalid principle'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('philosophy-real-settings',0));
 IF (SELECT count(*) FROM jsonb_array_elements(p_changes))<>(SELECT count(DISTINCT (c->>'target',c->>'id',c->>'field')) FROM jsonb_array_elements(p_changes)c) THEN RAISE EXCEPTION 'Duplicate setting'; END IF;
 FOR ch IN SELECT value FROM jsonb_array_elements(p_changes) LOOP
  IF NOT ch ? 'before' OR NOT ch ? 'after' OR ch->'before'=ch->'after' THEN RAISE EXCEPTION 'Exact different old/new values required'; END IF;
  old:=public.philosophy_real_setting(ch->>'target',ch->>'id',ch->>'field');
  IF old->'value' IS DISTINCT FROM ch->'before' THEN RAISE EXCEPTION 'Setting changed since review' USING ERRCODE='40001'; END IF;
  IF ch->>'target'='mastery_identity_settings' THEN
   IF ch->>'id'<>p_sport THEN RAISE EXCEPTION 'Sport mismatch'; END IF;
   IF ch->>'field'='elite_grade' AND (jsonb_typeof(ch->'after') IS DISTINCT FROM 'number' OR (ch->>'after')::numeric NOT IN (40,45,50,55,60,65,70,75,80)) THEN RAISE EXCEPTION 'Invalid grade step'; END IF;
   IF ch->>'field'='pitching_standards' THEN
    IF jsonb_typeof(ch->'after') IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'Numeric object required'; END IF;
    FOR pair IN SELECT * FROM jsonb_each(ch->'after') LOOP IF jsonb_typeof(pair.value) IS DISTINCT FROM 'number' OR (pair.value::text)::numeric<0 THEN RAISE EXCEPTION 'Invalid number'; END IF; END LOOP;
   END IF;
  ELSIF ch->>'field' IN ('tags','fault_keys','placements') THEN
   IF jsonb_typeof(ch->'after') IS DISTINCT FROM 'array' OR jsonb_array_length(ch->'after')>40 OR EXISTS(SELECT 1 FROM jsonb_array_elements(ch->'after')v WHERE jsonb_typeof(v) IS DISTINCT FROM 'string' OR length(v#>>'{}')>160) THEN RAISE EXCEPTION 'Invalid declared tags'; END IF;
  ELSIF ch->>'field'='weight' THEN IF jsonb_typeof(ch->'after') IS DISTINCT FROM 'number' OR (ch->>'after')::numeric NOT BETWEEN 0 AND 2 THEN RAISE EXCEPTION 'Invalid weight'; END IF;
  ELSIF ch->>'field'='routine_role' THEN IF ch->>'after' NOT IN ('bunting','baserunning','conditioning','mind','warmup','skill') THEN RAISE EXCEPTION 'Invalid role'; END IF;
  END IF;
  changes:=changes||jsonb_build_array(ch);
  PERFORM public.philosophy_real_setting(ch->>'target',ch->>'id',ch->>'field',true,ch->'after');
 END LOOP;
 pid:=public.owner_save_principle(NULL,p_body,p_sport,p_area,'owner-philosophy-cue','All players','Safety always wins','','experience','Owner-confirmed settings');
 receipt:=jsonb_build_object('principle_id',pid,'version',2,'version_id',gen_random_uuid(),'real',true,'changes',changes,'thread_id',p_thread,'undone',false);
 INSERT INTO public.coaching_principle_versions(id,principle_id,version,body,sport,area,situation,applies_when,not_when,connected_work,evidence_kind,evidence_note,created_by,configuration_receipt) VALUES((receipt->>'version_id')::uuid,pid,2,p_body,p_sport,p_area,'owner-philosophy-cue','All players','Safety always wins','','experience','Atomic settings receipt',auth.uid(),receipt);
 UPDATE public.coaching_principles SET current_version=2,updated_at=now() WHERE id=pid;
 INSERT INTO public.exercise_vault_audit(actor,action,slug,detail) VALUES(auth.uid(),'philosophy_real_settings_confirm','real',receipt);
 INSERT INTO public.recall_messages(thread_id,user_id,role,parts) VALUES(p_thread,auth.uid(),'assistant',jsonb_build_array(jsonb_build_object('type','text','entry','owner-philosophy','text','Confirmed — settings applied for players. Safety unchanged.','receipt',receipt)));
 RETURN receipt;
END $function$;

CREATE OR REPLACE FUNCTION public.owner_undo_real_settings(p_version uuid)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v public.coaching_principle_versions; receipt jsonb; ch jsonb; n integer;
BEGIN
 IF NOT public.has_role(auth.uid(),'owner') THEN RAISE EXCEPTION 'Owner only' USING ERRCODE='42501'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('philosophy-real-settings',0));
 SELECT * INTO v FROM public.coaching_principle_versions WHERE id=p_version;
 IF NOT FOUND OR v.created_by<>auth.uid() OR NOT coalesce((v.configuration_receipt->>'real')::boolean,false) OR coalesce((v.configuration_receipt->>'undone')::boolean,false) THEN RAISE EXCEPTION 'Undo receipt not found'; END IF;
 SELECT current_version+1 INTO n FROM public.coaching_principles WHERE id=v.principle_id FOR UPDATE;
 IF n<>v.version+1 THEN RAISE EXCEPTION 'Newer version exists' USING ERRCODE='40001'; END IF;
 FOR ch IN SELECT value FROM jsonb_array_elements(v.configuration_receipt->'changes') LOOP
  IF public.philosophy_real_setting(ch->>'target',ch->>'id',ch->>'field')->'value' IS DISTINCT FROM ch->'after' THEN RAISE EXCEPTION 'Setting changed after Confirm' USING ERRCODE='40001'; END IF;
  PERFORM public.philosophy_real_setting(ch->>'target',ch->>'id',ch->>'field',true,ch->'before');
 END LOOP;
 receipt:=v.configuration_receipt||jsonb_build_object('version',n,'version_id',gen_random_uuid(),'undone',true,'undo_of',v.id);
 INSERT INTO public.coaching_principle_versions(id,principle_id,version,body,sport,area,situation,applies_when,not_when,connected_work,evidence_kind,evidence_note,created_by,configuration_receipt) VALUES((receipt->>'version_id')::uuid,v.principle_id,n,v.body,v.sport,v.area,v.situation,v.applies_when,v.not_when,'','experience','Previous settings restored',auth.uid(),receipt);
 UPDATE public.coaching_principles SET current_version=n,active=false,updated_at=now() WHERE id=v.principle_id;
 INSERT INTO public.exercise_vault_audit(actor,action,slug,detail) VALUES(auth.uid(),'philosophy_real_settings_undo','real',receipt);
 INSERT INTO public.recall_messages(thread_id,user_id,role,parts) VALUES((receipt->>'thread_id')::uuid,auth.uid(),'assistant',jsonb_build_array(jsonb_build_object('type','text','entry','owner-philosophy','text','Undone — previous settings restored.','receipt',receipt)));
 RETURN receipt;
END $function$;

REVOKE ALL ON FUNCTION public.philosophy_real_setting(text,text,text,boolean,jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.owner_review_real_setting(text,text,text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.owner_confirm_real_settings(uuid,text,text,text,jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.owner_undo_real_settings(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.owner_review_real_setting(text,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.owner_confirm_real_settings(uuid,text,text,text,jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.owner_undo_real_settings(uuid) TO authenticated;
