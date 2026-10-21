DO $migration$
DECLARE d text; target constant text := 'a3574d4f-0296-4093-9607-c47b7323dd35';
BEGIN
 SELECT pg_get_functiondef('public.list_my_coaches(uuid)'::regprocedure) INTO d;
 IF position('WHERE ok.v AND' in d)=0 THEN RAISE EXCEPTION 'coach definition changed'; END IF;
 EXECUTE replace(d,'WHERE ok.v AND',format('WHERE c.coach_id <> %L::uuid AND (SELECT a FROM me) <> %L::uuid AND ok.v AND',target,target));
 SELECT pg_get_functiondef('public.list_my_requests_v2()'::regprocedure) INTO d;
 IF position('WHERE auth.uid() IS NOT NULL AND' in d)=0 THEN RAISE EXCEPTION 'request definition changed'; END IF;
 EXECUTE replace(d,'WHERE auth.uid() IS NOT NULL AND',format('WHERE r.from_user IS DISTINCT FROM %L::uuid AND r.to_user IS DISTINCT FROM %L::uuid AND r.subject_user IS DISTINCT FROM %L::uuid AND auth.uid() IS NOT NULL AND',target,target,target));
 SELECT pg_get_functiondef('public.list_org_roster(uuid)'::regprocedure) INTO d;
 IF position('WHERE m.organization_id=' in d)=0 OR position('AND a.revoked_at IS NULL)' in d)=0 THEN RAISE EXCEPTION 'roster definition changed'; END IF;
 d := replace(d,'WHERE m.organization_id=',format('WHERE m.user_id <> %L::uuid AND m.organization_id=',target));
 EXECUTE replace(d,'AND a.revoked_at IS NULL)',format('AND a.revoked_at IS NULL AND a.coach_user_id <> %L::uuid)',target));
 SELECT pg_get_functiondef('public.owner_principle_population_stats()'::regprocedure) INTO d;
 IF position('WHERE NOT EXISTS' in d)=0 THEN RAISE EXCEPTION 'population definition changed'; END IF;
 EXECUTE replace(d,'WHERE NOT EXISTS',format('WHERE rec.user_id <> %L::uuid AND NOT EXISTS',target));
 SELECT pg_get_functiondef('public.search_athletes_to_connect(text,uuid)'::regprocedure) INTO d;
 IF position('WHERE p.id <> v_uid' in d)=0 THEN RAISE EXCEPTION 'search definition changed'; END IF;
 EXECUTE replace(d,'WHERE p.id <> v_uid',format('WHERE p.id <> %L::uuid AND p.id <> v_uid',target));
 SELECT pg_get_functiondef('public.team_discipline_summary(uuid)'::regprocedure) INTO d;
 IF position('  RETURN coalesce((' in d)=0 THEN RAISE EXCEPTION 'discipline definition changed'; END IF;
 EXECUTE replace(d,'  RETURN coalesce((',format('  _ids := array_remove(_ids, %L::uuid);%s  RETURN coalesce((',target,chr(10)));
END $migration$;