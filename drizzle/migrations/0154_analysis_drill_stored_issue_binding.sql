-- Owner-authorized Oct29; exact original saved report keys only, no prose inference.
CREATE OR REPLACE FUNCTION public.wk_analysis_drill_atomic(p_user uuid,p_date date,p_id uuid,p_sport text,p_modality text,p_index integer,p_expected jsonb,p_replacement jsonb,p_enrollment jsonb,p_expected_updated timestamptz,p_safety jsonb,p_warnings jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE s public.athlete_plan_snapshots; b integer; result jsonb; v public.videos; reason text;
BEGIN
 PERFORM public.wk_lock_plan_day(p_user,p_date);
 IF p_safety IS DISTINCT FROM public.analysis_drill_safety_revision(p_user,p_date) THEN RAISE EXCEPTION 'Safety facts changed'; END IF;
 SELECT * INTO s FROM public.athlete_plan_snapshots WHERE id=p_id AND user_id=p_user AND plan_date=p_date AND sport=p_sport FOR UPDATE;
 IF NOT FOUND OR s.updated_at IS DISTINCT FROM p_expected_updated THEN RAISE EXCEPTION 'Plan changed'; END IF;
 SELECT * INTO v FROM public.videos WHERE id=(p_enrollment->>'video_id')::uuid AND user_id=p_user AND sport::text=p_sport AND status::text='completed' FOR SHARE;
 IF NOT FOUND OR (v.temporary_until IS NOT NULL AND v.temporary_until<=now()) OR v.module::text<>p_enrollment->>'category' THEN RAISE EXCEPTION 'Analysis unavailable'; END IF;
 IF p_enrollment->>'fault_key' IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.analysis_fault_findings WHERE video_id=v.id AND user_id=p_user AND sport=p_sport AND fault_key=p_enrollment->>'fault_key') AND coalesce(v.ai_analysis->'violations_detected'->>(p_enrollment->>'fault_key'),'false')<>'true' AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(CASE WHEN jsonb_typeof(v.ai_analysis->'improvements')='array' THEN v.ai_analysis->'improvements' ELSE '[]'::jsonb END) i WHERE i->>'fault_key'=p_enrollment->>'fault_key' AND i->>'fault_key'<>'other') AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(CASE WHEN jsonb_typeof(v.ai_analysis->'practice_checks')='array' THEN v.ai_analysis->'practice_checks' ELSE '[]'::jsonb END) c WHERE jsonb_typeof(c->'finding_tags')='array' AND c->'finding_tags' ? (p_enrollment->>'fault_key')) THEN RAISE EXCEPTION 'Finding unavailable'; END IF;
 IF p_expected->>'executionKind' IS NOT NULL OR p_expected->>'prescriptionOrigin'='owner' OR p_expected->>'ownerDrillId' IS NOT NULL OR p_expected->>'bunt' IS NOT NULL OR coalesce(p_expected->>'stage','drills')<>'drills' THEN RAISE EXCEPTION 'Protected slot'; END IF;
 reason:=p_enrollment->>'because';
 result:=public.wk_swap_block_atomic(p_user,p_date,p_id,p_sport,p_modality,p_index,p_expected,p_replacement,reason,'{}','today');
 INSERT INTO public.analysis_drill_enrollments(user_id,sport,category,drill_id,video_id,issue_key,fault_key,goal_label,observed_at) VALUES(p_user,p_sport,p_enrollment->>'category',p_replacement->>'slug',v.id,p_enrollment->>'issue_key',p_enrollment->>'fault_key',p_enrollment->>'goal_label',v.created_at)
 ON CONFLICT(user_id,sport,category,issue_key) DO UPDATE SET drill_id=excluded.drill_id,video_id=excluded.video_id,fault_key=excluded.fault_key,goal_label=excluded.goal_label,observed_at=excluded.observed_at,created_at=clock_timestamp();
 SELECT * INTO s FROM public.athlete_plan_snapshots WHERE id=p_id;
 SELECT ordinality::integer-1 INTO b FROM jsonb_array_elements(s.payload->'blocks') WITH ORDINALITY WHERE value->>'modality'=p_modality;
 s.payload:=jsonb_set(s.payload,ARRAY['blocks',b::text,'because'],coalesce(s.payload->'blocks'->b->'because','[]'::jsonb)||jsonb_build_array(reason));
 s.payload:=jsonb_set(s.payload,ARRAY['blocks',b::text,'steps'],(SELECT jsonb_agg(to_jsonb((d->>'name')||' — '||(d->>'dosage'))) FROM jsonb_array_elements(s.payload->'blocks'->b->'drills') d));
 UPDATE public.athlete_plan_snapshots SET payload=s.payload,updated_at=clock_timestamp() WHERE id=p_id;
 INSERT INTO public.audit_log(user_id,action,table_name,record_id,metadata) VALUES(p_user,'analysis_drill_add_today','analysis_drill_enrollments',v.id,jsonb_build_object('plan_date',p_date,'drill_id',p_replacement->>'slug','issue_key',p_enrollment->>'issue_key','warnings',p_warnings));
 RETURN jsonb_build_object('saved',true,'payload',s.payload,'drillId',p_replacement->>'slug');
END $$;
REVOKE ALL ON FUNCTION public.wk_analysis_drill_atomic(uuid,date,uuid,text,text,integer,jsonb,jsonb,jsonb,timestamptz,jsonb,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.wk_analysis_drill_atomic(uuid,date,uuid,text,text,integer,jsonb,jsonb,jsonb,timestamptz,jsonb,jsonb) TO service_role;