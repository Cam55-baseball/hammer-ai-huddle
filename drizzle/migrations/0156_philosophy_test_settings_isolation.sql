ALTER TABLE public.mastery_identity_settings ADD COLUMN IF NOT EXISTS test_overrides jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.library_videos ADD COLUMN IF NOT EXISTS test_overrides jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.owner_drills ADD COLUMN IF NOT EXISTS test_overrides jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.engine_dynamic_weights ADD COLUMN IF NOT EXISTS test_overrides jsonb NOT NULL DEFAULT '{}'::jsonb;
CREATE OR REPLACE FUNCTION public.philosophy_test_account(p_user uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT p_user IN ('a283a732-dfca-4160-9c9b-55305e092572'::uuid,'bb839f7d-6a03-460e-8b64-444f220b53da'::uuid) AND EXISTS(SELECT 1 FROM public.profiles WHERE id=p_user AND is_system_account IS TRUE); $$;
REVOKE ALL ON FUNCTION public.philosophy_test_account(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.philosophy_test_account(uuid) TO authenticated;
CREATE OR REPLACE FUNCTION public.philosophy_test_setting(p_user uuid,p_target text,p_id text,p_field text,p_write boolean DEFAULT false,p_value jsonb DEFAULT NULL,p_remove boolean DEFAULT false) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r jsonb; o jsonb; v jsonb; path text[]:=ARRAY[p_user::text,p_field];
BEGIN
 IF NOT public.philosophy_test_account(p_user) OR (auth.uid() IS DISTINCT FROM p_user AND NOT public.has_role(auth.uid(),'owner')) OR (p_write AND NOT public.has_role(auth.uid(),'owner')) THEN RAISE EXCEPTION 'TEST scope denied' USING ERRCODE='42501'; END IF;
 IF p_target='mastery_identity_settings' AND p_field IN ('elite_grade','pitching_standards','prescription_weights','weekly_minimums') THEN
  SELECT to_jsonb(s),s.test_overrides INTO r,o FROM public.mastery_identity_settings s WHERE sport=p_id FOR UPDATE;
  IF p_field='prescription_weights' THEN r:=r||'{"prescription_weights":{"hitting":1,"defense":1,"baserunning":1,"pitching":1}}'::jsonb; END IF;
  IF p_field='weekly_minimums' THEN r:=r||'{"weekly_minimums":{"hitting":3,"defense":4,"baserunning":1,"bunting":2,"conditioning":2}}'::jsonb; END IF;
 ELSIF p_target='library_videos' AND p_field='tags' THEN SELECT to_jsonb(s),s.test_overrides INTO r,o FROM public.library_videos s WHERE id=p_id::uuid FOR UPDATE;
 ELSIF p_target='owner_drills' AND p_field IN ('fault_keys','placements','routine_role') THEN SELECT to_jsonb(s),s.test_overrides INTO r,o FROM public.owner_drills s WHERE id=p_id::uuid FOR UPDATE;
 ELSIF p_target='engine_dynamic_weights' AND p_field='weight' THEN SELECT to_jsonb(s),s.test_overrides INTO r,o FROM public.engine_dynamic_weights s WHERE axis=p_id FOR UPDATE;
 ELSE RAISE EXCEPTION 'Unsupported existing setting'; END IF;
 IF r IS NULL THEN RAISE EXCEPTION 'Existing setting not found'; END IF;
 IF p_write THEN
  o:=CASE WHEN p_remove THEN o #- path ELSE jsonb_set(o||jsonb_build_object(p_user::text,coalesce(o->p_user::text,'{}'::jsonb)),path,p_value) END;
  IF p_target='mastery_identity_settings' THEN UPDATE public.mastery_identity_settings SET test_overrides=o WHERE sport=p_id;
  ELSIF p_target='library_videos' THEN UPDATE public.library_videos SET test_overrides=o WHERE id=p_id::uuid;
  ELSIF p_target='owner_drills' THEN UPDATE public.owner_drills SET test_overrides=o WHERE id=p_id::uuid;
  ELSE UPDATE public.engine_dynamic_weights SET test_overrides=o WHERE axis=p_id; END IF;
 END IF;
 RETURN jsonb_build_object('value',coalesce(o->p_user::text->p_field,r->p_field,'null'::jsonb),'override',o->p_user::text->p_field,'had_override',coalesce(o->p_user::text ? p_field,false));
END $$;
REVOKE ALL ON FUNCTION public.philosophy_test_setting(uuid,text,text,text,boolean,jsonb,boolean) FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION public.owner_review_test_setting(p_user uuid,p_target text,p_id text,p_field text) RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$ SELECT public.philosophy_test_setting(p_user,p_target,p_id,p_field); $$;
REVOKE ALL ON FUNCTION public.owner_review_test_setting(uuid,text,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.owner_review_test_setting(uuid,text,text,text) TO authenticated;
CREATE OR REPLACE FUNCTION public.owner_confirm_test_settings(p_thread uuid,p_user uuid,p_body text,p_sport text,p_area text,p_changes jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE ch jsonb; old jsonb; changes jsonb:='[]'; pid uuid; receipt jsonb; pair record; floors jsonb:='{"hitting":3,"defense":4,"baserunning":1,"bunting":2,"conditioning":2}';
BEGIN
 IF NOT public.has_role(auth.uid(),'owner') OR NOT public.philosophy_test_account(p_user) THEN RAISE EXCEPTION 'Owner TEST scope only' USING ERRCODE='42501'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.recall_threads WHERE id=p_thread AND user_id=auth.uid()) THEN RAISE EXCEPTION 'Conversation not found'; END IF;
 IF p_sport NOT IN ('baseball','softball') OR p_area NOT IN ('hitting','pitching','throwing','fielding','baserunning') OR coalesce(length(trim(p_body)),0)=0 OR length(p_body)>4000 OR jsonb_typeof(p_changes) IS DISTINCT FROM 'array' OR jsonb_array_length(p_changes) NOT BETWEEN 1 AND 12 THEN RAISE EXCEPTION 'Invalid principle'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('philosophy-test-settings',0));
 IF (SELECT count(*) FROM jsonb_array_elements(p_changes))<>(SELECT count(DISTINCT (c->>'target',c->>'id',c->>'field')) FROM jsonb_array_elements(p_changes)c) THEN RAISE EXCEPTION 'Duplicate setting'; END IF;
 FOR ch IN SELECT value FROM jsonb_array_elements(p_changes) LOOP
  IF NOT ch ? 'before' OR NOT ch ? 'after' OR ch->'before'=ch->'after' THEN RAISE EXCEPTION 'Exact different old/new values required'; END IF;
  old:=public.philosophy_test_setting(p_user,ch->>'target',ch->>'id',ch->>'field');
  IF old->'value' IS DISTINCT FROM ch->'before' THEN RAISE EXCEPTION 'Setting changed since review' USING ERRCODE='40001'; END IF;
  IF ch->>'target'='mastery_identity_settings' THEN
   IF ch->>'id'<>p_sport THEN RAISE EXCEPTION 'Sport mismatch'; END IF;
   IF ch->>'field'='elite_grade' AND (jsonb_typeof(ch->'after') IS DISTINCT FROM 'number' OR (ch->>'after')::numeric NOT IN (40,45,50,55,60,65,70,75,80)) THEN RAISE EXCEPTION 'Invalid grade step'; END IF;
   IF ch->>'field' IN ('prescription_weights','weekly_minimums','pitching_standards') THEN
    IF jsonb_typeof(ch->'after') IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'Numeric object required'; END IF;
    IF ch->>'field'='weekly_minimums' AND NOT (ch->'after' ?& ARRAY['hitting','defense','baserunning','bunting','conditioning']) THEN RAISE EXCEPTION 'Every purchased floor required'; END IF;
    FOR pair IN SELECT * FROM jsonb_each(ch->'after') LOOP
     IF jsonb_typeof(pair.value) IS DISTINCT FROM 'number' OR (pair.value::text)::numeric<0 THEN RAISE EXCEPTION 'Invalid number'; END IF;
     IF ch->>'field'='prescription_weights' AND (pair.key NOT IN ('hitting','defense','baserunning','pitching') OR (pair.value::text)::numeric NOT BETWEEN 0.5 AND 2) THEN RAISE EXCEPTION 'Weight outside selection bounds'; END IF;
     IF ch->>'field'='weekly_minimums' AND (NOT floors ? pair.key OR (pair.value::text)::numeric<(floors->>pair.key)::numeric OR (pair.value::text)::numeric>6 OR (pair.value::text)::numeric<>trunc((pair.value::text)::numeric)) THEN RAISE EXCEPTION 'Cannot lower a purchased floor or exceed six days'; END IF;
    END LOOP;
   END IF;
  ELSIF ch->>'field' IN ('tags','fault_keys','placements') THEN
   IF jsonb_typeof(ch->'after') IS DISTINCT FROM 'array' OR jsonb_array_length(ch->'after')>40 OR EXISTS(SELECT 1 FROM jsonb_array_elements(ch->'after')v WHERE jsonb_typeof(v) IS DISTINCT FROM 'string' OR length(v#>>'{}')>160) THEN RAISE EXCEPTION 'Invalid declared tags'; END IF;
  ELSIF ch->>'field'='weight' THEN IF jsonb_typeof(ch->'after') IS DISTINCT FROM 'number' OR (ch->>'after')::numeric NOT BETWEEN 0 AND 2 THEN RAISE EXCEPTION 'Invalid weight'; END IF;
  ELSIF ch->>'field'='routine_role' THEN IF ch->>'after' NOT IN ('bunting','baserunning','conditioning','mind','warmup','skill') THEN RAISE EXCEPTION 'Invalid role'; END IF;
  END IF;
  changes:=changes||jsonb_build_array(ch||jsonb_build_object('previous_override',old->'override','had_override',old->'had_override'));
  PERFORM public.philosophy_test_setting(p_user,ch->>'target',ch->>'id',ch->>'field',true,ch->'after');
 END LOOP;
 pid:=public.owner_save_principle(NULL,p_body,p_sport,p_area,'owner-philosophy-test-cue','Exact TEST athlete only','Never real players; safety always wins','','experience','TEST isolated settings');
 receipt:=jsonb_build_object('principle_id',pid,'version',2,'version_id',gen_random_uuid(),'test_user',p_user,'test_only',true,'changes',changes,'thread_id',p_thread,'undone',false);
 INSERT INTO public.coaching_principle_versions(id,principle_id,version,body,sport,area,situation,applies_when,not_when,connected_work,evidence_kind,evidence_note,created_by,configuration_receipt) VALUES((receipt->>'version_id')::uuid,pid,2,p_body,p_sport,p_area,'owner-philosophy-test-cue','Exact TEST settings','Never real players','','experience','Atomic settings receipt',auth.uid(),receipt);
 UPDATE public.coaching_principles SET current_version=2,updated_at=now() WHERE id=pid;
 INSERT INTO public.exercise_vault_audit(actor,action,slug,detail) VALUES(auth.uid(),'philosophy_settings_confirm',p_user::text,receipt);
 INSERT INTO public.recall_messages(thread_id,user_id,role,parts) VALUES(p_thread,auth.uid(),'assistant',jsonb_build_array(jsonb_build_object('type','text','entry','owner-philosophy','text','Confirmed — exact TEST settings applied. Safety unchanged.','receipt',receipt)));
 RETURN receipt;
END $$;
REVOKE ALL ON FUNCTION public.owner_confirm_test_settings(uuid,uuid,text,text,text,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.owner_confirm_test_settings(uuid,uuid,text,text,text,jsonb) TO authenticated;
CREATE OR REPLACE FUNCTION public.owner_undo_test_settings(p_version uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v public.coaching_principle_versions; receipt jsonb; ch jsonb; uid uuid; n integer;
BEGIN
 IF NOT public.has_role(auth.uid(),'owner') THEN RAISE EXCEPTION 'Owner only' USING ERRCODE='42501'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('philosophy-test-settings',0));
 SELECT * INTO v FROM public.coaching_principle_versions WHERE id=p_version;
 IF NOT FOUND OR v.created_by<>auth.uid() OR v.configuration_receipt->>'test_user' IS NULL OR (v.configuration_receipt->>'undone')::boolean THEN RAISE EXCEPTION 'Undo receipt not found'; END IF;
 uid:=(v.configuration_receipt->>'test_user')::uuid;
 IF NOT public.philosophy_test_account(uid) THEN RAISE EXCEPTION 'TEST scope changed'; END IF;
 SELECT current_version+1 INTO n FROM public.coaching_principles WHERE id=v.principle_id FOR UPDATE;
 IF n<>v.version+1 THEN RAISE EXCEPTION 'Newer version exists' USING ERRCODE='40001'; END IF;
 FOR ch IN SELECT value FROM jsonb_array_elements(v.configuration_receipt->'changes') LOOP
  IF public.philosophy_test_setting(uid,ch->>'target',ch->>'id',ch->>'field')->'value' IS DISTINCT FROM ch->'after' THEN RAISE EXCEPTION 'Setting changed after Confirm' USING ERRCODE='40001'; END IF;
  PERFORM public.philosophy_test_setting(uid,ch->>'target',ch->>'id',ch->>'field',true,ch->'previous_override',NOT (ch->>'had_override')::boolean);
 END LOOP;
 receipt:=v.configuration_receipt||jsonb_build_object('version',n,'version_id',gen_random_uuid(),'undone',true,'undo_of',v.id);
 INSERT INTO public.coaching_principle_versions(id,principle_id,version,body,sport,area,situation,applies_when,not_when,connected_work,evidence_kind,evidence_note,created_by,configuration_receipt) VALUES((receipt->>'version_id')::uuid,v.principle_id,n,v.body,v.sport,v.area,v.situation,v.applies_when,v.not_when,'','experience','Exact TEST settings restored',auth.uid(),receipt);
 UPDATE public.coaching_principles SET current_version=n,active=false,updated_at=now() WHERE id=v.principle_id;
 INSERT INTO public.exercise_vault_audit(actor,action,slug,detail) VALUES(auth.uid(),'philosophy_settings_undo',uid::text,receipt);
 INSERT INTO public.recall_messages(thread_id,user_id,role,parts) VALUES((receipt->>'thread_id')::uuid,auth.uid(),'assistant',jsonb_build_array(jsonb_build_object('type','text','entry','owner-philosophy','text','Undone — exact previous TEST settings restored.','receipt',receipt)));
 RETURN receipt;
END $$;
REVOKE ALL ON FUNCTION public.owner_undo_test_settings(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.owner_undo_test_settings(uuid) TO authenticated;