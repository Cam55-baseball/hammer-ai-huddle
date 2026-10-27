CREATE OR REPLACE FUNCTION public.start_hammers_today()
 RETURNS timestamp with time zone
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v timestamptz; c record; dob date; season text; eq_ok boolean; miss text[] := '{}';
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not signed in'; END IF;
 SELECT hammers_today_started_at, date_of_birth INTO v, dob FROM public.profiles WHERE id = auth.uid();
 IF NOT FOUND THEN RAISE EXCEPTION 'account not found'; END IF;
 IF v IS NOT NULL THEN RETURN v; END IF;
 SELECT sport_primary, position_primary, competition_level, category_goals, goal_summary, goal_priority_rank, weekly_availability_days
   INTO c FROM public.athlete_context WHERE user_id = auth.uid();
 SELECT season_status INTO season FROM public.athlete_mpi_settings WHERE user_id = auth.uid()
   ORDER BY (sport = c.sport_primary) DESC NULLS LAST LIMIT 1;
 SELECT coalesce(jsonb_array_length(to_jsonb(equipment)) > 0, false) INTO eq_ok
   FROM public.athlete_equipment_context WHERE user_id = auth.uid() AND scope = 'persistent' LIMIT 1;
 IF dob IS NULL THEN miss := miss || 'birthday'; END IF;
 IF c.sport_primary IS NULL OR c.sport_primary NOT IN ('baseball','softball') THEN miss := miss || 'sport'; END IF;
 IF coalesce(btrim(c.position_primary),'') = '' THEN miss := miss || 'position'; END IF;
 IF coalesce(btrim(c.competition_level),'') = '' THEN miss := miss || 'level of play'; END IF;
 IF coalesce(btrim(c.goal_summary),'') = '' AND (c.category_goals IS NULL OR c.category_goals::text IN ('{}','[]','null')) THEN miss := miss || 'goals';
 ELSIF c.goal_priority_rank IS NULL AND coalesce(jsonb_array_length(CASE WHEN jsonb_typeof(c.category_goals->'categoryOrder')='array' THEN c.category_goals->'categoryOrder' END),0) = 0 THEN miss := miss || 'goal ranking'; END IF;
 IF coalesce(btrim(season),'') = '' THEN miss := miss || 'season'; END IF;
 IF coalesce(c.weekly_availability_days,0) <= 0 THEN miss := miss || 'training days'; END IF;
 IF NOT coalesce(eq_ok,false) THEN miss := miss || 'equipment'; END IF;
 IF NOT EXISTS (SELECT 1 FROM public.initial_assessments WHERE user_id = auth.uid() AND completed_at IS NOT NULL) THEN miss := miss || 'starting assessment'; END IF;
 IF array_length(miss,1) > 0 THEN RAISE EXCEPTION 'Missing: %', array_to_string(miss, ', '); END IF;
 UPDATE public.profiles SET hammers_today_started_at = now() WHERE id = auth.uid() AND hammers_today_started_at IS NULL;
 SELECT hammers_today_started_at INTO v FROM public.profiles WHERE id = auth.uid();
 RETURN v;
END $function$;