ALTER TABLE public.physio_health_profiles ADD COLUMN IF NOT EXISTS current_pain_answer boolean, ADD COLUMN IF NOT EXISTS current_pain_area text, ADD COLUMN IF NOT EXISTS current_pain_reviewed_at timestamptz;
COMMENT ON COLUMN public.physio_health_profiles.current_pain_answer IS 'Explicit player answer; false never clears injury history, restrictions or return-to-play authorization.';
CREATE OR REPLACE FUNCTION public.initial_plan_missing(p_user uuid DEFAULT auth.uid()) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE c jsonb; p jsonb; m jsonb; h jsonb; ps jsonb; a jsonb; pitches boolean; golden boolean; out_items jsonb:='[]'; k text; missing boolean; lbl text; total integer;
BEGIN
 IF p_user IS NULL OR (auth.uid() IS DISTINCT FROM p_user AND coalesce(auth.role(),'') <> 'service_role') THEN RAISE EXCEPTION 'Not authorized' USING ERRCODE='42501'; END IF;
 SELECT to_jsonb(x) INTO p FROM public.profiles x WHERE id=p_user;
 SELECT to_jsonb(x) INTO c FROM public.athlete_context x WHERE user_id=p_user;
 SELECT to_jsonb(x) INTO m FROM public.athlete_mpi_settings x WHERE user_id=p_user;
 SELECT to_jsonb(x) INTO h FROM public.physio_health_profiles x WHERE user_id=p_user;
 SELECT to_jsonb(x) INTO ps FROM public.pitcher_schedule_settings x WHERE user_id=p_user;
 SELECT answers INTO a FROM public.athlete_starting_points WHERE user_id=p_user AND sport=c->>'sport_primary';
 SELECT EXISTS(SELECT 1 FROM public.subscriptions s CROSS JOIN LATERAL unnest(s.subscribed_modules) md WHERE s.user_id=p_user AND s.status IN ('active','trialing') AND md=coalesce(c->>'sport_primary','')||'_golden2way') INTO golden;
 pitches:=p_user<>'95de827d-7418-460b-8b79-267bf79bdca4'::uuid AND (coalesce(c->>'position_primary','') IN ('P','pitcher','Pitcher') OR ps->>'primary_focus'='pitcher' OR (NOT golden AND EXISTS(SELECT 1 FROM public.subscriptions s CROSS JOIN LATERAL unnest(s.subscribed_modules) md WHERE s.user_id=p_user AND s.status IN ('active','trialing') AND md IN (coalesce(c->>'sport_primary','')||'_pitcher',coalesce(c->>'sport_primary','')||'_pitching','pitching'))));
 total:=CASE WHEN pitches THEN 10 ELSE 9 END;
 FOREACH k IN ARRAY ARRAY['birthday','sport','position','bats_throws','level','season','goals','health','starting_point','pitching_role'] LOOP
 CASE k
 WHEN 'birthday' THEN lbl:='Your birthday'; missing:=p->>'date_of_birth' IS NULL;
 WHEN 'sport' THEN lbl:='Your sport'; missing:=coalesce(c->>'sport_primary','') NOT IN ('baseball','softball');
 WHEN 'position' THEN lbl:='Main position'; missing:=coalesce(btrim(c->>'position_primary'),'')='';
 WHEN 'bats_throws' THEN lbl:='Which side you bat and throw from'; missing:=coalesce(c->>'bats_hand','') NOT IN ('L','R','S','B') OR coalesce(c->>'throws_hand','') NOT IN ('L','R','S','B');
 WHEN 'level' THEN lbl:='Playing level'; missing:=coalesce(btrim(c->>'competition_level'),'')='';
 WHEN 'season' THEN lbl:='Season status'; missing:=coalesce(m->>'season_status','') NOT IN ('off_season','preseason','in_season','post_season') AND coalesce(c->>'season_phase','') NOT IN ('off','pre','in','post');
 WHEN 'goals' THEN lbl:='Top goals'; missing:=coalesce(c->'category_goals','null'::jsonb) IN ('null'::jsonb,'{}'::jsonb,'[]'::jsonb);
 WHEN 'health' THEN lbl:='Anything hurt right now?'; missing:=h->>'current_pain_reviewed_at' IS NULL OR h->>'current_pain_answer' IS NULL OR (h->>'current_pain_answer'='true' AND coalesce(btrim(h->>'current_pain_area'),'')='');
 WHEN 'starting_point' THEN lbl:='Where are you starting from?'; missing:=coalesce(a->>'last_trained','') NOT IN ('Right now','1–2 weeks ago','3–6 weeks ago','2–6 months ago','6+ months ago','Never','Easing back in');
 WHEN 'pitching_role' THEN lbl:='Pitching role'; missing:=pitches AND coalesce(ps->>'pitching_role','') NOT IN ('starter','bullpen','closer');
 END CASE;
 IF missing THEN out_items:=out_items||jsonb_build_array(jsonb_build_object('key',k,'label',lbl,'to','/dashboard','required',true,'total_needed',total)); END IF;
 END LOOP;
 IF golden AND p_user<>'95de827d-7418-460b-8b79-267bf79bdca4'::uuid AND coalesce(ps->>'primary_focus','') NOT IN ('pitcher','position') THEN out_items:=out_items||jsonb_build_array(jsonb_build_object('key','pitcher_focus','label','Mainly pitcher or position player?','to','/profile','required',false,'total_needed',total)); END IF;
 RETURN out_items;
END $$;
REVOKE ALL ON FUNCTION public.initial_plan_missing(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.initial_plan_missing(uuid) TO authenticated, service_role;
CREATE OR REPLACE FUNCTION public.start_hammers_today() RETURNS timestamptz LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v timestamptz; missing jsonb;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
 SELECT hammers_today_started_at INTO v FROM public.profiles WHERE id=auth.uid();
 IF NOT FOUND THEN RAISE EXCEPTION 'Account not found'; END IF;
 IF v IS NOT NULL THEN RETURN v; END IF;
 SELECT coalesce(jsonb_agg(x),'[]'::jsonb) INTO missing FROM jsonb_array_elements(public.initial_plan_missing(auth.uid())) x WHERE coalesce((x->>'required')::boolean,true);
 IF jsonb_array_length(missing)>0 THEN RAISE EXCEPTION 'Missing: %',(SELECT string_agg(x->>'label',', ') FROM jsonb_array_elements(missing)x); END IF;
 UPDATE public.profiles SET hammers_today_started_at=now() WHERE id=auth.uid() AND hammers_today_started_at IS NULL RETURNING hammers_today_started_at INTO v;
 RETURN v;
END $$;
REVOKE ALL ON FUNCTION public.start_hammers_today() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.start_hammers_today() TO authenticated;