DO $$ DECLARE definition text; old_clause text := 'WHERE p.user_id = ANY(coalesce(_ids,''{}'')) AND p.plan_date BETWEEN current_date - 28 AND current_date - 1'; BEGIN
 SELECT pg_get_functiondef('public.team_discipline_summary(uuid)'::regprocedure) INTO definition;
 IF position(old_clause IN definition)=0 THEN RAISE EXCEPTION 'Team Discipline reader changed; review before applying'; END IF;
 definition:=replace(definition,old_clause,old_clause||' AND p.replaced_by_coach_rx IS NULL AND NOT public.coach_session_exempt(p.user_id,p.plan_date,p.id::text)');
 EXECUTE definition;
END $$;