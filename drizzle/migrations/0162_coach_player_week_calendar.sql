CREATE OR REPLACE FUNCTION public.coach_athlete_week(_athlete uuid, _from date)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE _sport text; _days jsonb;
BEGIN
 IF NOT public._coach_training_access(_athlete) THEN RETURN jsonb_build_object('state','denied'); END IF;
 IF _from IS NULL THEN RAISE EXCEPTION 'week start required'; END IF;
 SELECT sport_primary INTO _sport FROM public.athlete_context WHERE user_id=_athlete;
 SELECT jsonb_agg(jsonb_build_object(
 'date',d.day,'plan',public.coach_athlete_plan(_athlete,d.day),
 'restDay',COALESCE((SELECT (s.payload->>'restDay')::boolean FROM public.athlete_plan_snapshots s WHERE s.user_id=_athlete AND s.plan_date=d.day AND s.sport=_sport ORDER BY s.updated_at DESC LIMIT 1),false),
 'prescriptions',COALESCE((SELECT jsonb_agg(jsonb_build_object('id',p.id,'slot',p.slot,'movement_slug',p.movement_slug,'movement_name',p.movement_name,'sets',p.sets,'reps',p.reps,'status',p.status,'replaced_by_coach_rx',p.replaced_by_coach_rx,'dosage_unit',p.dosage_unit) ORDER BY p.sequence_order,p.id) FROM public.wk_prescriptions p WHERE p.user_id=_athlete AND p.plan_date=d.day),'[]'::jsonb),
 'logs',COALESCE((SELECT jsonb_agg(jsonb_build_object('id',l.id,'prescription_id',l.prescription_id,'plan_date',l.plan_date,'movement_slug',l.movement_slug,'sets_completed',l.sets_completed,'reps_completed',l.reps_completed,'total_reps_completed',l.total_reps_completed,'duration_seconds_completed',l.duration_seconds_completed,'duration_seconds_precise',l.duration_seconds_precise,'distance_feet_completed',l.distance_feet_completed,'load_used',l.load_used,'metrics',jsonb_build_object('rounds',l.metrics->'rounds')) ORDER BY l.created_at,l.id) FROM public.wk_session_logs l WHERE l.user_id=_athlete AND l.plan_date=d.day),'[]'::jsonb),
 'tasks',COALESCE((SELECT jsonb_agg(jsonb_build_object('task_id',t.task_id,'source',t.source,'side',t.side,'completed',t.completed,'outcome',t.payload->>'outcome','name',t.payload->>'name','dosage',t.payload->>'dosage','log',jsonb_build_object('rounds',t.payload->'log'->'rounds','fields',t.payload->'log'->'fields')) ORDER BY t.task_id,t.side) FROM public.hammer_daily_task_completions t WHERE t.user_id=_athlete AND t.plan_date=d.day AND (t.payload->>'sport' IS NULL OR t.payload->>'sport'=_sport)),'[]'::jsonb),
 'coachWorkouts',COALESCE((SELECT jsonb_agg(jsonb_build_object('id',c.id,'title',c.title,'category',c.category,'status',c.status,'cancelled_at',c.cancelled_at,'exercises',(SELECT COALESCE(jsonb_agg(jsonb_build_object('name',e->>'name','movement_name',e->>'movement_name','slug',e->>'slug','movement_slug',e->>'movement_slug','sets',e->'sets','reps',e->'reps')),'[]'::jsonb) FROM jsonb_array_elements(c.exercises) e)) ORDER BY c.created_at,c.id) FROM public.coach_prescriptions c WHERE c.recipient_id=_athlete AND c.plan_date=d.day),'[]'::jsonb)
 ) ORDER BY d.day) INTO _days FROM (SELECT _from+i AS day FROM generate_series(0,6) i) d;
 RETURN jsonb_build_object('state','ok','sport',_sport,'days',_days);
END $$;
REVOKE ALL ON FUNCTION public.coach_athlete_week(uuid,date) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.coach_athlete_week(uuid,date) TO authenticated,service_role;