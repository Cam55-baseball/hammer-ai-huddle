CREATE OR REPLACE FUNCTION public.wk_external_training_days(p_user uuid, p_from date, p_to date)
 RETURNS TABLE(day date, kind text, intensity text, source text)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
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
    SELECT ps.session_date, 'hard_run', 'high', 'Base Stealer'
      FROM performance_sessions ps
     WHERE ps.user_id = p_user AND ps.deleted_at IS NULL
       AND ps.session_type IN ('base_stealing','softball_stealing')
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
$function$;
REVOKE ALL ON FUNCTION public.wk_external_training_days(uuid,date,date) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.wk_external_training_days(uuid,date,date) TO service_role;