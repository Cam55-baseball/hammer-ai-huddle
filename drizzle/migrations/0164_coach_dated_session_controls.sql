CREATE TABLE public.coach_session_controls (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), athlete_id uuid NOT NULL, actor_id uuid NOT NULL, actor_name text NOT NULL, plan_date date NOT NULL, sport text NOT NULL,
 task_id text NOT NULL, side text, source text NOT NULL, source_ref text NOT NULL, target_name text NOT NULL, card_title text NOT NULL,
 mode text NOT NULL CHECK (mode IN ('allow','remove')), reason text NOT NULL DEFAULT '', created_at timestamptz NOT NULL DEFAULT now(), skipped_at timestamptz,
 UNIQUE NULLS NOT DISTINCT (athlete_id,plan_date,sport,task_id,side)
);
GRANT SELECT ON public.coach_session_controls TO authenticated;
GRANT ALL ON public.coach_session_controls TO service_role;
ALTER TABLE public.coach_session_controls ENABLE ROW LEVEL SECURITY;
CREATE POLICY read_session_controls ON public.coach_session_controls FOR SELECT TO authenticated USING (athlete_id=auth.uid() OR (actor_id=auth.uid() AND public._coach_training_access(athlete_id)) OR public._coach_training_access(athlete_id));
CREATE INDEX coach_session_controls_day ON public.coach_session_controls(athlete_id,plan_date,sport);
CREATE OR REPLACE FUNCTION public.coach_session_control_write(p_athlete uuid,p_date date,p_sport text,p_targets jsonb,p_mode text,p_reason text DEFAULT '') RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE t jsonb; p public.wk_prescriptions; b jsonb; d jsonb; actor text; source text; ref text; tid text; side_value text; name_value text; found_target boolean; result_ids jsonb:='[]'; new_id uuid; snap jsonb;
BEGIN
 IF auth.uid() IS NULL OR auth.uid()=p_athlete OR NOT public._coach_training_access(p_athlete) THEN RAISE EXCEPTION 'Training access is not available' USING ERRCODE='42501'; END IF;
 IF p_date<current_date OR p_date>current_date+42 OR p_mode NOT IN ('allow','remove') OR jsonb_typeof(p_targets)<>'array' OR jsonb_array_length(p_targets) NOT BETWEEN 1 AND 100 OR length(coalesce(p_reason,''))>1000 THEN RAISE EXCEPTION 'Choose current or upcoming saved work'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.athlete_context WHERE user_id=p_athlete AND sport_primary=p_sport) THEN RAISE EXCEPTION 'Refresh the player sport'; END IF;
 PERFORM public.wk_lock_plan_day(p_athlete,p_date);
 SELECT full_name INTO actor FROM public.profiles WHERE id=auth.uid();
 SELECT payload INTO snap FROM public.athlete_plan_snapshots WHERE user_id=p_athlete AND plan_date=p_date AND sport=p_sport ORDER BY updated_at DESC LIMIT 1;
 FOR t IN SELECT value FROM jsonb_array_elements(p_targets) LOOP
 tid:=t->>'taskId'; side_value:=nullif(t->>'side',''); source:=t->>'source'; ref:=t->>'sourceRef'; found_target:=false;
 IF side_value IS NOT NULL AND side_value NOT IN ('L','R') THEN RAISE EXCEPTION 'Invalid activity side'; END IF;
 IF source='wk_prescription' THEN
 SELECT * INTO p FROM public.wk_prescriptions WHERE id::text=tid AND user_id=p_athlete AND plan_date=p_date AND replaced_by_coach_rx IS NULL FOR UPDATE;
 IF FOUND AND p.slot=ref AND side_value IS NULL THEN
  found_target:=true; name_value:=p.movement_name;
  IF p.slot IN ('warmup','ub_primer') OR p.sequence_role IN ('arm_care','trunk_primer') THEN RAISE EXCEPTION 'Keep preparation and arm care in place so the remaining work stays safe'; END IF;
 END IF;
 ELSIF source='block_drill' THEN
 FOR b IN SELECT value FROM jsonb_array_elements(coalesce(snap->'blocks','[]')) LOOP
 IF b->>'modality'=ref AND nullif(b->>'side','') IS NOT DISTINCT FROM side_value AND b->>'status'='ready' AND b->>'replacedByCoachRx' IS NULL THEN
 FOR d IN SELECT value FROM jsonb_array_elements(coalesce(b->'drills','[]')) LOOP
 IF tid=ref||':'||left(trim(both '-' from regexp_replace(lower(trim(coalesce(nullif(d->>'slug',''),d->>'name'))),'[^a-z0-9]+','-','g')),80) THEN
 found_target:=true; name_value:=d->>'name';
 IF ref='warmup' OR d->>'stage'='prep' THEN RAISE EXCEPTION 'Keep preparation in place so the remaining work stays safe'; END IF;
 END IF; END LOOP; END IF; END LOOP;
 END IF;
 IF NOT found_target THEN RAISE EXCEPTION 'Saved activity changed; refresh the calendar'; END IF;
 IF EXISTS(SELECT 1 FROM public.coach_session_controls WHERE athlete_id=p_athlete AND plan_date=p_date AND sport=p_sport AND task_id=tid AND side IS NOT DISTINCT FROM side_value) THEN RAISE EXCEPTION 'This activity already has a coach decision'; END IF;
 INSERT INTO public.coach_session_controls(athlete_id,actor_id,actor_name,plan_date,sport,task_id,side,source,source_ref,target_name,card_title,mode,reason)
 VALUES(p_athlete,auth.uid(),coalesce(actor,'Your coach'),p_date,p_sport,tid,side_value,source,ref,name_value,coalesce(nullif(t->>'cardTitle',''),ref),p_mode,coalesce(p_reason,'')) RETURNING id INTO new_id;
 INSERT INTO public.audit_log(user_id,action,table_name,record_id,metadata) VALUES(p_athlete,'coach_session_'||p_mode,'coach_session_controls',new_id,jsonb_build_object('actor_id',auth.uid(),'date',p_date,'sport',p_sport,'task_id',tid,'side',side_value,'reason',coalesce(p_reason,'')));
 result_ids:=result_ids||jsonb_build_array(new_id);
 END LOOP;
 RETURN jsonb_build_object('applied',true,'ids',result_ids);
END $$;
REVOKE ALL ON FUNCTION public.coach_session_control_write(uuid,date,text,jsonb,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.coach_session_control_write(uuid,date,text,jsonb,text,text) TO authenticated;
CREATE OR REPLACE FUNCTION public.player_allowed_skip(p_ids uuid[]) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE c public.coach_session_controls; n integer:=0;
BEGIN
 IF auth.uid() IS NULL OR coalesce(array_length(p_ids,1),0) NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION 'Choose an allowed activity'; END IF;
 FOR c IN SELECT * FROM public.coach_session_controls WHERE id=ANY(p_ids) ORDER BY plan_date,id FOR UPDATE LOOP
 IF c.athlete_id<>auth.uid() OR c.mode<>'allow' OR c.plan_date<>current_date OR NOT EXISTS(SELECT 1 FROM public.athlete_context WHERE user_id=auth.uid() AND sport_primary=c.sport) THEN RAISE EXCEPTION 'This skip is not available today' USING ERRCODE='42501'; END IF;
 PERFORM public.wk_lock_plan_day(c.athlete_id,c.plan_date);
 IF c.skipped_at IS NULL THEN
 UPDATE public.coach_session_controls SET skipped_at=now() WHERE id=c.id;
 INSERT INTO public.audit_log(user_id,action,table_name,record_id,metadata) VALUES(auth.uid(),'player_allowed_skip','coach_session_controls',c.id,jsonb_build_object('task_id',c.task_id,'date',c.plan_date,'coach_id',c.actor_id));
 END IF;
 n:=n+1;
 END LOOP;
 IF n<>array_length(p_ids,1) THEN RAISE EXCEPTION 'Allowed work could not be found'; END IF;
 RETURN jsonb_build_object('applied',true);
END $$;
REVOKE ALL ON FUNCTION public.player_allowed_skip(uuid[]) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.player_allowed_skip(uuid[]) TO authenticated;
CREATE OR REPLACE FUNCTION public.coach_session_exempt(p_athlete uuid,p_date date,p_task text,p_side text DEFAULT NULL) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT EXISTS(SELECT 1 FROM public.coach_session_controls c JOIN public.athlete_context a ON a.user_id=c.athlete_id AND a.sport_primary=c.sport WHERE c.athlete_id=p_athlete AND c.plan_date=p_date AND c.task_id=p_task AND c.side IS NOT DISTINCT FROM p_side AND (c.mode='remove' OR c.skipped_at IS NOT NULL));
$$;
REVOKE ALL ON FUNCTION public.coach_session_exempt(uuid,date,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.coach_session_exempt(uuid,date,text,text) TO service_role;
CREATE OR REPLACE FUNCTION public.coach_athlete_discipline(_athlete uuid) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE _from date:=current_date-89; _days jsonb; _skips jsonb;
BEGIN
 IF NOT public._coach_training_access(_athlete) THEN RAISE EXCEPTION 'not authorized' USING ERRCODE='42501'; END IF;
 WITH rx AS (SELECT p.plan_date,p.slot,EXISTS(SELECT 1 FROM public.wk_session_logs l WHERE l.prescription_id=p.id) AS done FROM public.wk_prescriptions p WHERE p.user_id=_athlete AND p.plan_date BETWEEN _from AND current_date AND p.replaced_by_coach_rx IS NULL AND NOT public.coach_session_exempt(_athlete,p.plan_date,p.id::text))
 SELECT coalesce((SELECT jsonb_agg(jsonb_build_object('date',plan_date,'prescribed',n,'done',d) ORDER BY plan_date) FROM (SELECT plan_date,count(*) n,count(*) FILTER(WHERE done) d FROM rx GROUP BY plan_date) x),'[]'),coalesce((SELECT jsonb_agg(jsonb_build_object('slot',slot,'skipped',s,'prescribed',n) ORDER BY s DESC) FROM (SELECT coalesce(slot,'other') slot,count(*) FILTER(WHERE NOT done AND plan_date<current_date) s,count(*) FILTER(WHERE plan_date<current_date) n FROM rx GROUP BY 1) y WHERE n>0),'[]') INTO _days,_skips;
 RETURN jsonb_build_object('days',_days,'skips',_skips,'from',_from,'to',current_date);
END $$;