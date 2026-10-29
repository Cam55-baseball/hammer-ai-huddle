ALTER TABLE public.initial_assessments ADD COLUMN IF NOT EXISTS initial_input_answers jsonb;
COMMENT ON COLUMN public.initial_assessments.initial_input_answers IS 'Explicit initial setup review acknowledgements; unknown dates remain unknown, never invented.';
CREATE OR REPLACE FUNCTION public.initial_plan_missing(p_user uuid DEFAULT auth.uid()) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE c jsonb; p jsonb; m jsonb; a jsonb; n jsonb; h jsonb; out_items jsonb := '[]'; k text; lbl text; dest text; pairs text[]:=ARRAY['birthday','sport','position','level','goals','ranking','season','days','equipment','assessment','bats','throws','height','weight','sleep','lifting','season_dates','calorie_goal','protein_goal','carbs_goal','fats_goal','hydration_goal','health']; missing boolean;
BEGIN
 IF p_user IS NULL OR (auth.uid() IS DISTINCT FROM p_user AND coalesce(auth.role(),'') <> 'service_role') THEN RAISE EXCEPTION 'Not authorized' USING ERRCODE='42501'; END IF;
 SELECT to_jsonb(x) INTO p FROM public.profiles x WHERE id=p_user;
 SELECT to_jsonb(x) INTO c FROM public.athlete_context x WHERE user_id=p_user;
 SELECT to_jsonb(x) INTO m FROM public.athlete_mpi_settings x WHERE user_id=p_user;
 SELECT to_jsonb(x) INTO a FROM public.initial_assessments x WHERE user_id=p_user;
 SELECT to_jsonb(x) INTO n FROM public.vault_nutrition_goals x WHERE user_id=p_user;
 SELECT to_jsonb(x) INTO h FROM public.physio_health_profiles x WHERE user_id=p_user;
 FOREACH k IN ARRAY pairs LOOP
 dest := '/assessment?review=profile'; missing:=false;
 CASE k
 WHEN 'birthday' THEN lbl:='Your birthday'; dest:='/signup'; missing:=p->>'date_of_birth' IS NULL;
 WHEN 'sport' THEN lbl:='Your sport'; dest:='/signup'; missing:=coalesce(c->>'sport_primary','') NOT IN ('baseball','softball');
 WHEN 'position' THEN lbl:='Your position'; missing:=coalesce(btrim(c->>'position_primary'),'')='';
 WHEN 'level' THEN lbl:='Your level of play'; missing:=coalesce(btrim(c->>'competition_level'),'')='';
 WHEN 'goals' THEN lbl:='Your goals'; missing:=coalesce(c->'category_goals','null'::jsonb) IN ('null'::jsonb,'{}'::jsonb,'[]'::jsonb);
 WHEN 'ranking' THEN lbl:='Rank your goals'; missing:=coalesce(jsonb_array_length(CASE WHEN jsonb_typeof(c->'category_goals'->'categoryOrder')='array' THEN c->'category_goals'->'categoryOrder' ELSE '[]'::jsonb END),0)=0;
 WHEN 'season' THEN lbl:='Your season phase'; missing:=coalesce(m->>'season_status','') NOT IN ('off_season','preseason','in_season','post_season');
 WHEN 'days' THEN lbl:='Days available each week'; missing:=jsonb_typeof(c->'weekly_availability_days') IS DISTINCT FROM 'number' OR NOT coalesce((c->>'weekly_availability_days')::numeric BETWEEN 1 AND 7,false);
 WHEN 'equipment' THEN lbl:='Your equipment (bodyweight is an answer)'; missing:=NOT EXISTS(SELECT 1 FROM public.athlete_equipment_context WHERE user_id=p_user AND scope='persistent' AND cardinality(equipment)>0);
 WHEN 'assessment' THEN lbl:='Finish your starting assessment'; dest:='/assessment'; missing:=a->>'completed_at' IS NULL;
 WHEN 'bats' THEN lbl:='Which side you bat from'; missing:=coalesce(c->>'bats_hand','') NOT IN ('L','R','S');
 WHEN 'throws' THEN lbl:='Which hand you throw with'; missing:=coalesce(c->>'throws_hand','') NOT IN ('L','R','S');
 WHEN 'height' THEN lbl:='Your height'; missing:=jsonb_typeof(c->'anthropometrics'->'height_in') IS DISTINCT FROM 'number' OR NOT coalesce((c->'anthropometrics'->>'height_in')::numeric>0,false);
 WHEN 'weight' THEN lbl:='Your weight'; missing:=jsonb_typeof(c->'anthropometrics'->'weight_lb') IS DISTINCT FROM 'number' OR NOT coalesce((c->'anthropometrics'->>'weight_lb')::numeric>0,false);
 WHEN 'sleep' THEN lbl:='Usual sleep (hours a night)'; missing:=jsonb_typeof(c->'sleep_target_hrs') IS DISTINCT FROM 'number' OR NOT coalesce((c->>'sleep_target_hrs')::numeric>0,false);
 WHEN 'lifting' THEN lbl:='Years of lifting (0 if never)'; missing:=jsonb_typeof(c->'lifting_age_years') IS DISTINCT FROM 'number' OR NOT coalesce((c->>'lifting_age_years')::numeric>=0,false);
 WHEN 'season_dates' THEN lbl:='Review your season dates (or say not known yet)'; missing:=NOT coalesce((a->'initial_input_answers'->>'season_dates_reviewed')::boolean,false);
 WHEN 'health' THEN lbl:='Your health & physio setup'; missing:=NOT coalesce((h->>'setup_completed')::boolean,false);
 ELSE
 lbl:=CASE k WHEN 'calorie_goal' THEN 'Daily calories (kcal)' WHEN 'protein_goal' THEN 'Protein (g)' WHEN 'carbs_goal' THEN 'Carbohydrates (g)' WHEN 'fats_goal' THEN 'Fat (g)' ELSE 'Water (oz)' END;
 missing:=jsonb_typeof(n->k) IS DISTINCT FROM 'number' OR NOT coalesce((n->>k)::numeric>=0,false);
 END CASE;
 IF missing THEN out_items:=out_items||jsonb_build_array(jsonb_build_object('key',k,'label',lbl,'to',dest)); END IF;
 END LOOP;
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
 missing:=public.initial_plan_missing(auth.uid());
 IF jsonb_array_length(missing)>0 THEN RAISE EXCEPTION 'Missing: %', (SELECT string_agg(x->>'label',', ') FROM jsonb_array_elements(missing) x); END IF;
 UPDATE public.profiles SET hammers_today_started_at=now() WHERE id=auth.uid() AND hammers_today_started_at IS NULL RETURNING hammers_today_started_at INTO v;
 RETURN v;
END $$;
REVOKE ALL ON FUNCTION public.start_hammers_today() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.start_hammers_today() TO authenticated;