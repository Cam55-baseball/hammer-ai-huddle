CREATE TABLE public.wk_plan_changes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  plan_date date NOT NULL,
  reason_code text NOT NULL CHECK (reason_code IN ('player_request','tracked_activity','rule_check','built')),
  reason_text text NOT NULL,
  changed_slots text[] NOT NULL DEFAULT '{}',
  kept_slots text[] NOT NULL DEFAULT '{}',
  outcome text NOT NULL DEFAULT 'changed',
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX wk_plan_changes_user_date ON public.wk_plan_changes(user_id, plan_date, created_at DESC);
GRANT SELECT, INSERT ON public.wk_plan_changes TO authenticated;
GRANT ALL ON public.wk_plan_changes TO service_role;
ALTER TABLE public.wk_plan_changes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own plan changes read" ON public.wk_plan_changes FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own swap notes insert" ON public.wk_plan_changes FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND reason_code = 'player_request');

CREATE OR REPLACE FUNCTION public.wk_adjust_prescriptions_atomic(
  p_user uuid, p_date date, p_rows jsonb, p_replace_slots text[], p_reason_code text, p_reason_text text, p_detail jsonb DEFAULT '{}'::jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_marked text[]; v_replace text[]; v_kept text[];
BEGIN
  IF p_user IS NULL OR p_date IS NULL THEN RAISE EXCEPTION 'p_user and p_date are required'; END IF;
  IF p_reason_code NOT IN ('player_request','tracked_activity','rule_check') THEN RAISE EXCEPTION 'bad reason'; END IF;
  -- Never touch a card that has any marked row.
  SELECT COALESCE(array_agg(DISTINCT slot), '{}') INTO v_marked FROM wk_prescriptions
   WHERE user_id = p_user AND plan_date = p_date AND status NOT IN ('planned','pending');
  SELECT COALESCE(array_agg(s), '{}') INTO v_replace FROM unnest(COALESCE(p_replace_slots,'{}')) s WHERE NOT (s = ANY(v_marked));
  SELECT COALESCE(array_agg(DISTINCT slot), '{}') INTO v_kept FROM wk_prescriptions
   WHERE user_id = p_user AND plan_date = p_date AND NOT (slot = ANY(v_replace));
  IF cardinality(v_replace) = 0 THEN
    INSERT INTO wk_plan_changes(user_id, plan_date, reason_code, reason_text, kept_slots, outcome, detail)
    VALUES (p_user, p_date, p_reason_code, p_reason_text, v_kept, 'no_change', COALESCE(p_detail,'{}'));
    RETURN jsonb_build_object('changed', '{}'::text[], 'kept', v_kept);
  END IF;
  DELETE FROM wk_prescriptions WHERE user_id = p_user AND plan_date = p_date
    AND slot = ANY(v_replace) AND status IN ('planned','pending');
  IF jsonb_typeof(p_rows) = 'array' THEN
    INSERT INTO public.wk_prescriptions (
      user_id, plan_date, phase, slot, sequence_order, sequence_role,
      movement_slug, movement_name, sets, reps, tempo, load_pct,
      duration_seconds, distance_feet, total_reps, dosage_unit,
      cns_cost, cns_clamped, substituted_from_slug, substitution_reason,
      why_payload, rationale, adaptation, engine, why_v2,
      validator_report, generator_version, status,
      intent_tag, execution_note, per_side, asymmetry_rule, open_ended,
      set_range_max, density_target_seconds, rir_low, rir_high,
      cue_ids, troubleshoot_video_id, intensity_mode)
    SELECT p_user, p_date, (r->>'phase'), (r->>'slot'),
      (r->>'sequence_order')::int, NULLIF(r->>'sequence_role',''),
      (r->>'movement_slug'), (r->>'movement_name'),
      NULLIF(r->>'sets','')::int, NULLIF(r->>'reps','')::int,
      NULLIF(r->>'tempo',''), NULLIF(r->>'load_pct','')::int,
      NULLIF(r->>'duration_seconds','')::int, NULLIF(r->>'distance_feet','')::int,
      NULLIF(r->>'total_reps','')::int, NULLIF(r->>'dosage_unit',''),
      COALESCE((r->>'cns_cost')::int, 0), COALESCE((r->>'cns_clamped')::boolean, false),
      NULLIF(r->>'substituted_from_slug',''), NULLIF(r->>'substitution_reason',''),
      COALESCE(r->'why_payload','{}'::jsonb), NULLIF(r->>'rationale',''), NULLIF(r->>'adaptation',''),
      NULLIF(r->>'engine',''), NULLIF(r->'why_v2','null'::jsonb), NULLIF(r->'validator_report','null'::jsonb),
      NULLIF(r->>'generator_version',''), 'planned',
      (r->>'intent_tag'), (r->>'execution_note'), (r->>'per_side')::boolean, (r->>'asymmetry_rule'),
      (r->>'open_ended')::boolean, (r->>'set_range_max')::int, (r->>'density_target_seconds')::int,
      (r->>'rir_low')::int, (r->>'rir_high')::int,
      CASE WHEN jsonb_typeof(r->'cue_ids') = 'array' THEN ARRAY(SELECT jsonb_array_elements_text(r->'cue_ids')) ELSE NULL END,
      (r->>'troubleshoot_video_id')::uuid, (r->>'intensity_mode')
    FROM jsonb_array_elements(p_rows) r WHERE (r->>'slot') = ANY(v_replace);
  END IF;
  INSERT INTO wk_plan_changes(user_id, plan_date, reason_code, reason_text, changed_slots, kept_slots, detail)
  VALUES (p_user, p_date, p_reason_code, p_reason_text, v_replace, v_kept, COALESCE(p_detail,'{}'));
  RETURN jsonb_build_object('changed', v_replace, 'kept', v_kept);
END $$;
REVOKE ALL ON FUNCTION public.wk_adjust_prescriptions_atomic(uuid,date,jsonb,text[],text,text,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.wk_adjust_prescriptions_atomic(uuid,date,jsonb,text[],text,text,jsonb) TO service_role;

-- Completed training from the other programs, as Hammers Today day kinds.
CREATE OR REPLACE FUNCTION public.wk_external_training_days(p_user uuid, p_from date, p_to date)
RETURNS TABLE(day date, kind text, intensity text, source text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  WITH tz AS (
    SELECT CASE WHEN p.timezone IS NOT NULL AND EXISTS (SELECT 1 FROM pg_timezone_names t WHERE t.name = p.timezone)
                THEN p.timezone ELSE 'UTC' END AS z
    FROM (SELECT 1) x LEFT JOIN profiles p ON p.id = p_user
  ), smp AS (
    SELECT s.sub_module, (d.value #>> '{}') AS ts
    FROM sub_module_progress s,
         LATERAL jsonb_each(CASE WHEN jsonb_typeof(s.day_completion_times)='object' THEN s.day_completion_times ELSE '{}'::jsonb END) w,
         LATERAL jsonb_each(CASE WHEN jsonb_typeof(w.value)='object' THEN w.value ELSE '{}'::jsonb END) d
    WHERE s.user_id = p_user
  ), allrows AS (
    SELECT (ts::timestamptz AT TIME ZONE (SELECT z FROM tz))::date AS day, 'lift'::text AS kind, 'moderate'::text AS intensity,
           CASE sub_module WHEN 'production_lab' THEN 'Iron Bambino' WHEN 'production_studio' THEN 'Heat Factory'
                           WHEN 'the-unicorn' THEN 'The Unicorn' ELSE sub_module END AS source
      FROM smp WHERE ts ~ '^\d{4}-\d{2}-\d{2}'
    UNION ALL
    SELECT session_date, 'hard_run', 'high', 'Speed Lab / Explosive Conditioning'
      FROM speed_sessions WHERE user_id = p_user AND COALESCE(is_break_day,false) = false
    UNION ALL
    SELECT COALESCE((completed_at AT TIME ZONE (SELECT z FROM tz))::date, (created_at AT TIME ZONE (SELECT z FROM tz))::date),
           'hard_run', 'high', 'Running session'
      FROM running_sessions WHERE user_id = p_user AND completed IS TRUE
       AND (COALESCE(intent,'') || ' ' || COALESCE(run_type,'')) ~* '(sprint|speed|max|accel|top|interval|tempo|hard)'
    UNION ALL
    SELECT COALESCE((w.completed_at AT TIME ZONE (SELECT z FROM tz))::date, w.scheduled_date), 'lift',
           CASE WHEN w.workout_type ~* '(max|heavy|high|strength)' THEN 'heavy'
                WHEN w.workout_type ~* '(deload|light|recover|reduced)' THEN 'light' ELSE 'moderate' END,
           'Training block'
      FROM block_workouts w JOIN training_blocks b ON b.id = w.block_id
     WHERE b.user_id = p_user AND (w.status = 'completed' OR w.completed_at IS NOT NULL)
       AND COALESCE(w.workout_type,'') !~* '(recover|mobility|rest|deload)'
    UNION ALL
    SELECT l.entry_date, 'lift', 'moderate', 'Custom workout'
      FROM custom_activity_logs l JOIN custom_activity_templates t ON t.id = l.template_id
     WHERE l.user_id = p_user AND l.completed IS TRUE AND t.activity_type = 'workout'
  )
  SELECT DISTINCT day, kind, intensity, source FROM allrows WHERE day BETWEEN p_from AND p_to;
$$;
REVOKE ALL ON FUNCTION public.wk_external_training_days(uuid,date,date) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.wk_external_training_days(uuid,date,date) TO service_role;

CREATE OR REPLACE FUNCTION public.wk_mark_missed_lifts()
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_from date; v_missed int := 0; v_cut int := 0; v_done int := 0;
BEGIN
  SELECT enabled_from INTO v_from FROM wk_missed_lift_settings WHERE id = 1 FOR UPDATE;
  IF v_from IS NULL THEN
    v_from := (now() AT TIME ZONE 'UTC')::date;
    UPDATE wk_missed_lift_settings SET enabled_from = v_from, updated_at = now() WHERE id = 1;
  END IF;

  -- Every card type (lift, speed, bat speed, conditioning, cross-sport, primers ...).
  CREATE TEMP TABLE _due ON COMMIT DROP AS
  SELECT rx.id, rx.sets,
         COALESCE((SELECT sum(COALESCE(cardinality(l.reps_completed), l.sets_completed, 0))
                   FROM wk_session_logs l WHERE l.prescription_id = rx.id), 0) AS logged_sets,
         EXISTS (SELECT 1 FROM wk_session_logs l WHERE l.prescription_id = rx.id) AS has_log,
         EXISTS (SELECT 1 FROM hammer_daily_task_completions c
                  WHERE c.user_id = rx.user_id AND c.plan_date = rx.plan_date
                    AND c.task_id = rx.id::text AND c.completed IS TRUE) AS checked
  FROM wk_prescriptions rx
  LEFT JOIN profiles p ON p.id = rx.user_id
  WHERE rx.status IN ('planned', 'pending')
    AND rx.plan_date >= v_from
    AND rx.plan_date < (now() AT TIME ZONE
          CASE WHEN p.timezone IS NOT NULL
                AND EXISTS (SELECT 1 FROM pg_timezone_names t WHERE t.name = p.timezone)
               THEN p.timezone ELSE 'Etc/GMT+12' END)::date;

  -- Checked off, fully logged, or logged on a card without sets: done.
  UPDATE wk_prescriptions rx SET status = 'completed'
  FROM _due d WHERE rx.id = d.id AND (d.checked
     OR (d.has_log AND (d.sets IS NULL OR d.sets <= 0 OR d.logged_sets >= d.sets)));
  GET DIAGNOSTICS v_done = ROW_COUNT;

  -- Partly logged card with sets: Cut short.
  UPDATE wk_session_logs l
     SET metrics = COALESCE(l.metrics, '{}'::jsonb) || jsonb_build_object('one_tap_outcome', 'cut_short')
  FROM _due d
  WHERE l.prescription_id = d.id AND NOT d.checked AND d.has_log AND d.sets > 0 AND d.logged_sets < d.sets
    AND COALESCE(l.metrics->>'one_tap_outcome', '') = '';
  UPDATE wk_prescriptions rx SET status = 'completed'
  FROM _due d WHERE rx.id = d.id AND NOT d.checked AND d.has_log AND d.sets > 0 AND d.logged_sets < d.sets;
  GET DIAGNOSTICS v_cut = ROW_COUNT;

  -- Unchecked and unlogged: Missed.
  UPDATE wk_prescriptions rx SET status = 'missed'
  FROM _due d WHERE rx.id = d.id AND NOT d.has_log AND NOT d.checked;
  GET DIAGNOSTICS v_missed = ROW_COUNT;

  UPDATE wk_missed_lift_settings SET last_run_at = now() WHERE id = 1;
  RETURN jsonb_build_object('enabled_from', v_from, 'missed', v_missed, 'cut_short', v_cut, 'completed', v_done);
END;
$function$;