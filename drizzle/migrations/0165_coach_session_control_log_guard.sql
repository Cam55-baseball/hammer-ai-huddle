CREATE OR REPLACE FUNCTION public.guard_coach_session_log() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE tid text; side_value text;
BEGIN
 IF TG_TABLE_NAME='wk_session_logs' THEN tid:=NEW.prescription_id::text; side_value:=NULL;
 ELSE tid:=NEW.task_id; side_value:=NEW.side; END IF;
 IF public.coach_session_exempt(NEW.user_id,NEW.plan_date,tid,side_value) THEN
  RAISE EXCEPTION 'This activity was removed or skipped with coach permission for this session. Previously logged work is kept.';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER coach_removed_work_log_guard BEFORE INSERT OR UPDATE ON public.wk_session_logs FOR EACH ROW EXECUTE FUNCTION public.guard_coach_session_log();
CREATE TRIGGER coach_removed_task_log_guard BEFORE INSERT OR UPDATE ON public.hammer_daily_task_completions FOR EACH ROW EXECUTE FUNCTION public.guard_coach_session_log();
