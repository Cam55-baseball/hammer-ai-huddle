ALTER TABLE public.wk_prescriptions ADD COLUMN IF NOT EXISTS rest_seconds integer NULL;
CREATE OR REPLACE FUNCTION public.coach_rx_commit_choice(p_user uuid, p_rx uuid, p_date date, p_choice text, p_rows jsonb, p_slots text[], p_safety jsonb, p_expected_updated_at timestamptz) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r public.coach_prescriptions; n integer := 0; inserted integer := 0;
BEGIN
 PERFORM public.wk_lock_plan_day(p_user,p_date);
 SELECT * INTO r FROM public.coach_prescriptions WHERE id=p_rx FOR UPDATE;
 IF NOT FOUND OR r.recipient_id<>p_user THEN RAISE EXCEPTION 'Not your prescription' USING ERRCODE='42501'; END IF;
 IF r.cancelled_at IS NOT NULL OR r.status NOT IN ('pending','saved_for_later') OR r.updated_at IS DISTINCT FROM p_expected_updated_at THEN RAISE EXCEPTION 'Workout changed; refresh and try again' USING ERRCODE='40001'; END IF;
 IF p_choice NOT IN ('use_instead','add_alongside','save_for_later','declined') THEN RAISE EXCEPTION 'Invalid choice'; END IF;
 IF p_choice IN ('use_instead','add_alongside') THEN
  IF jsonb_typeof(p_rows)<>'array' OR jsonb_array_length(p_rows)=0 THEN RAISE EXCEPTION 'No usable exercises'; END IF;
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(p_rows) e WHERE (e->>'user_id')::uuid IS DISTINCT FROM p_user OR (e->>'plan_date')::date IS DISTINCT FROM p_date OR e->'why_payload'->>'coach_rx' IS DISTINCT FROM p_rx::text) THEN RAISE EXCEPTION 'Invalid workout rows'; END IF;
  IF p_choice='use_instead' THEN
   UPDATE public.wk_prescriptions SET status='skipped',replaced_by_coach_rx=p_rx WHERE user_id=p_user AND plan_date=p_date AND slot=ANY(p_slots) AND replaced_by_coach_rx IS NULL AND status NOT IN ('completed','skipped');
   GET DIAGNOSTICS n=ROW_COUNT;
   IF n=0 THEN RAISE EXCEPTION 'The card changed; refresh and try again' USING ERRCODE='40001'; END IF;
  END IF;
  INSERT INTO public.wk_prescriptions(user_id,plan_date,slot,sequence_order,sequence_role,movement_slug,movement_name,phase,sets,reps,duration_seconds,rest_seconds,distance_feet,total_reps,dosage_unit,cns_cost,cns_clamped,rationale,status,why_payload)
  SELECT user_id,plan_date,slot,sequence_order,sequence_role,movement_slug,movement_name,phase,sets,reps,duration_seconds,rest_seconds,distance_feet,total_reps,dosage_unit,cns_cost,cns_clamped,rationale,status,why_payload FROM jsonb_populate_recordset(NULL::public.wk_prescriptions,p_rows);
  GET DIAGNOSTICS inserted=ROW_COUNT;
 END IF;
 UPDATE public.coach_prescriptions SET status=CASE p_choice WHEN 'use_instead' THEN 'used_instead' WHEN 'add_alongside' THEN 'added_alongside' ELSE p_choice END,plan_date=CASE WHEN p_choice IN ('use_instead','add_alongside') THEN p_date ELSE r.plan_date END,safety_result=coalesce(p_safety,r.safety_result),updated_at=now() WHERE id=p_rx;
 RETURN jsonb_build_object('applied',true,'replaced',n,'inserted',inserted);
END $$;
REVOKE ALL ON FUNCTION public.coach_rx_commit_choice(uuid,uuid,date,text,jsonb,text[],jsonb,timestamptz) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.coach_rx_commit_choice(uuid,uuid,date,text,jsonb,text[],jsonb,timestamptz) TO service_role;
COMMENT ON FUNCTION public.coach_rx_commit_choice(uuid,uuid,date,text,jsonb,text[],jsonb,timestamptz) IS 'Trusted coach workout choice commit: existing athlete/day lock, optimistic prescription revision, atomic replaced rows/new rows/date/status. Only safety-checked service handler may invoke.';