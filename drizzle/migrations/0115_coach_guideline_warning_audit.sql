CREATE POLICY "Prescription sends use warning checked service" ON public.coach_prescriptions AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (false);
CREATE OR REPLACE FUNCTION public.record_coach_guideline_overrides() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE old_count integer:=0; new_count integer; entry jsonb; finding jsonb; actor uuid; stamp timestamptz; idx integer;
BEGIN
 IF TG_OP='UPDATE' THEN old_count:=jsonb_array_length(coalesce(OLD.safety_result->'overrides','[]'::jsonb)); END IF;
 new_count:=jsonb_array_length(coalesce(NEW.safety_result->'overrides','[]'::jsonb));
 IF new_count<old_count THEN RAISE EXCEPTION 'Override history must be retained'; END IF;
 IF TG_OP='UPDATE' AND old_count>0 AND EXISTS(SELECT 1 FROM generate_series(0,old_count-1) i WHERE OLD.safety_result->'overrides'->i IS DISTINCT FROM NEW.safety_result->'overrides'->i) THEN RAISE EXCEPTION 'Override history cannot be rewritten'; END IF;
 IF new_count>old_count THEN
  FOR idx IN old_count..new_count-1 LOOP
   entry:=NEW.safety_result->'overrides'->idx;
   actor:=(entry->>'actor_id')::uuid; stamp:=(entry->>'occurred_at')::timestamptz;
   IF actor IS NULL OR stamp IS NULL OR actor NOT IN (NEW.sender_id,NEW.recipient_id) OR entry->>'action' NOT IN ('send','reschedule','resend','use_instead','add_alongside') OR jsonb_typeof(entry->'warnings') IS DISTINCT FROM 'array' OR jsonb_array_length(entry->'warnings')=0 THEN RAISE EXCEPTION 'Invalid coach acknowledgement'; END IF;
   FOR finding IN SELECT value FROM jsonb_array_elements(entry->'warnings') LOOP
    IF finding->>'code' NOT IN ('rest_day','game_day','before_game','lift_spacing','weekly_lift_max','trained_elsewhere_today','run_before_game','run_spacing','jump_spacing','bat_consecutive') OR (finding->>'date')::date<>NEW.plan_date OR finding->>'player_id' IS DISTINCT FROM NEW.recipient_id::text OR coalesce(length(finding->>'rule'),0)=0 THEN RAISE EXCEPTION 'Invalid guideline warning'; END IF;
   END LOOP;
   INSERT INTO public.audit_log(user_id,action,table_name,record_id,metadata,created_at) VALUES(actor,'coach_guideline_override','coach_prescriptions',NEW.id,entry||jsonb_build_object('recipient_id',NEW.recipient_id,'prescription_id',NEW.id),stamp);
   INSERT INTO public.behavioral_events(user_id,event_type,event_date,metadata,created_at) VALUES(NEW.recipient_id,'coach_guideline_override',NEW.plan_date,entry||jsonb_build_object('prescription_id',NEW.id,'sender_id',NEW.sender_id),stamp);
  END LOOP;
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.record_coach_guideline_overrides() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER coach_guideline_override_audit AFTER INSERT OR UPDATE OF safety_result ON public.coach_prescriptions FOR EACH ROW EXECUTE FUNCTION public.record_coach_guideline_overrides();
COMMENT ON FUNCTION public.record_coach_guideline_overrides() IS 'Append dated nonmedical guideline acknowledgements to existing audit and behavioral records atomically with the checked prescription action; medical and integrity rules never become acknowledgements.';