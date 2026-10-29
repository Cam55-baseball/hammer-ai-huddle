ALTER TABLE public.coaching_principle_versions ADD COLUMN IF NOT EXISTS configuration_receipt jsonb;
COMMENT ON COLUMN public.coaching_principle_versions.configuration_receipt IS 'Atomic before/after receipt for existing setting edits; not a parallel rule source. TEST cue receipts never enter global principle picks.';
CREATE OR REPLACE FUNCTION public.owner_confirm_test_cue(p_thread uuid,p_body text,p_sport text,p_area text,p_change jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE c public.wk_movement_catalog; pid uuid; vid uuid; receipt jsonb; before_cue text; after_cue text;
BEGIN
 IF NOT public.has_role(auth.uid(),'owner') THEN RAISE EXCEPTION 'Owner only' USING ERRCODE='42501'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.recall_threads WHERE id=p_thread AND user_id=auth.uid()) THEN RAISE EXCEPTION 'Conversation not found'; END IF;
 IF p_sport NOT IN ('baseball','softball') OR p_area NOT IN ('hitting','pitching','throwing','fielding','baserunning') OR coalesce(length(trim(p_body)),0)=0 OR length(p_body)>4000 THEN RAISE EXCEPTION 'Invalid principle'; END IF;
 IF p_change->>'target' IS DISTINCT FROM 'wk_movement_catalog' OR p_change->>'field' IS DISTINCT FROM 'cue' OR jsonb_typeof(p_change->'before') IS DISTINCT FROM 'string' OR jsonb_typeof(p_change->'after') IS DISTINCT FROM 'string' THEN RAISE EXCEPTION 'Only an existing TEST cue can change'; END IF;
 SELECT * INTO c FROM public.wk_movement_catalog WHERE id=(p_change->>'id')::uuid FOR UPDATE;
 IF NOT FOUND OR coalesce(cardinality(c.visible_to),0)=0 OR EXISTS(SELECT 1 FROM unnest(c.visible_to) u LEFT JOIN public.profiles p ON p.id=u WHERE p.id IS NULL OR p.is_system_account IS DISTINCT FROM true) THEN RAISE EXCEPTION 'Cue is not exclusively scoped to TEST accounts'; END IF;
 before_cue:=p_change->>'before'; after_cue:=trim(p_change->>'after');
 IF coalesce(c.cue,'') IS DISTINCT FROM before_cue THEN RAISE EXCEPTION 'Cue changed since review. Review again.' USING ERRCODE='40001'; END IF;
 IF length(after_cue)=0 OR length(after_cue)>500 OR after_cue=before_cue THEN RAISE EXCEPTION 'Invalid replacement cue'; END IF;
 pid:=public.owner_save_principle(NULL,p_body,p_sport,p_area,'owner-philosophy-test-cue','TEST catalog allowlist only','Never real players or changes to dose, safety or selection','', 'experience','TEST-only cue wording proof');
 -- Append-only version trigger requires receipt to be included on initial INSERT.
 -- owner_save_principle already inserts version 1; store the linked receipt as a second immutable version.
 SELECT id INTO vid FROM public.coaching_principle_versions WHERE principle_id=pid AND version=1;
 receipt:=jsonb_build_object('principle_id',pid,'version',2,'version_id',gen_random_uuid(),'test_only',true,'changes',jsonb_build_array(p_change),'catalog_slug',c.slug,'thread_id',p_thread,'undone',false);
 INSERT INTO public.coaching_principle_versions(id,principle_id,version,body,sport,area,situation,applies_when,not_when,connected_work,evidence_kind,evidence_note,created_by,configuration_receipt)
 VALUES((receipt->>'version_id')::uuid,pid,2,p_body,p_sport,p_area,'owner-philosophy-test-cue','TEST catalog allowlist only','Never real players','','experience','Atomic TEST cue receipt',auth.uid(),receipt);
 UPDATE public.coaching_principles SET current_version=2,updated_at=now() WHERE id=pid;
 UPDATE public.wk_movement_catalog SET cue=after_cue WHERE id=c.id;
 INSERT INTO public.exercise_vault_audit(actor,action,slug,detail) VALUES(auth.uid(),'philosophy_cue_confirm',c.slug,receipt);
 INSERT INTO public.recall_messages(thread_id,user_id,role,parts) VALUES(p_thread,auth.uid(),'assistant',jsonb_build_array(jsonb_build_object('type','text','entry','owner-philosophy','text','Confirmed — TEST cue wording applied. Dose and safety unchanged.','receipt',receipt)));
 RETURN receipt;
END $$;
REVOKE ALL ON FUNCTION public.owner_confirm_test_cue(uuid,text,text,text,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.owner_confirm_test_cue(uuid,text,text,text,jsonb) TO authenticated;
CREATE OR REPLACE FUNCTION public.owner_undo_test_cue(p_version uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v public.coaching_principle_versions; c public.wk_movement_catalog; ch jsonb; receipt jsonb; next_version integer;
BEGIN
 IF NOT public.has_role(auth.uid(),'owner') THEN RAISE EXCEPTION 'Owner only' USING ERRCODE='42501'; END IF;
 SELECT * INTO v FROM public.coaching_principle_versions WHERE id=p_version;
 IF NOT FOUND OR v.created_by<>auth.uid() OR v.configuration_receipt IS NULL OR (v.configuration_receipt->>'undone')::boolean THEN RAISE EXCEPTION 'Undo receipt not found'; END IF;
 SELECT current_version+1 INTO next_version FROM public.coaching_principles WHERE id=v.principle_id FOR UPDATE;
 IF next_version<>v.version+1 THEN RAISE EXCEPTION 'A newer version exists. Review before Undo.' USING ERRCODE='40001'; END IF;
 ch:=v.configuration_receipt->'changes'->0;
 SELECT * INTO c FROM public.wk_movement_catalog WHERE id=(ch->>'id')::uuid FOR UPDATE;
 IF NOT FOUND OR coalesce(cardinality(c.visible_to),0)=0 OR EXISTS(SELECT 1 FROM unnest(c.visible_to) u LEFT JOIN public.profiles p ON p.id=u WHERE p.id IS NULL OR p.is_system_account IS DISTINCT FROM true) THEN RAISE EXCEPTION 'TEST scope changed; Undo refused'; END IF;
 IF c.cue IS DISTINCT FROM trim(ch->>'after') THEN RAISE EXCEPTION 'Cue changed after Confirm. Review before Undo.' USING ERRCODE='40001'; END IF;
 receipt:=v.configuration_receipt||jsonb_build_object('version',next_version,'version_id',gen_random_uuid(),'undone',true,'undo_of',v.id);
 UPDATE public.wk_movement_catalog SET cue=ch->>'before' WHERE id=c.id;
 INSERT INTO public.coaching_principle_versions(id,principle_id,version,body,sport,area,situation,applies_when,not_when,connected_work,evidence_kind,evidence_note,created_by,configuration_receipt)
 VALUES((receipt->>'version_id')::uuid,v.principle_id,next_version,v.body,v.sport,v.area,v.situation,v.applies_when,v.not_when,'','experience','Undo restores exact prior cue',auth.uid(),receipt);
 UPDATE public.coaching_principles SET current_version=next_version,active=false,updated_at=now() WHERE id=v.principle_id;
 INSERT INTO public.exercise_vault_audit(actor,action,slug,detail) VALUES(auth.uid(),'philosophy_cue_undo',c.slug,receipt);
 INSERT INTO public.recall_messages(thread_id,user_id,role,parts) VALUES((receipt->>'thread_id')::uuid,auth.uid(),'assistant',jsonb_build_array(jsonb_build_object('type','text','entry','owner-philosophy','text','Undone — the exact previous TEST cue is restored.','receipt',receipt)));
 RETURN receipt;
END $$;
REVOKE ALL ON FUNCTION public.owner_undo_test_cue(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.owner_undo_test_cue(uuid) TO authenticated;
CREATE OR REPLACE FUNCTION public.active_principle_picks() RETURNS TABLE(id uuid,sport text,area text,situation text,applies_when text,not_when text,connected_work text) LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT v.id,v.sport,v.area,v.situation,v.applies_when,v.not_when,v.connected_work FROM public.coaching_principles p JOIN public.coaching_principle_versions v ON v.principle_id=p.id AND v.version=p.current_version WHERE p.active AND v.situation IS DISTINCT FROM 'owner-philosophy-test-cue';
$$;