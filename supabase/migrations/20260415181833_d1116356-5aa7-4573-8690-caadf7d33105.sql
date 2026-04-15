CREATE OR REPLACE FUNCTION public.derive_activity_completion()
RETURNS TRIGGER AS $$
DECLARE
  checkbox_states JSONB;
  all_complete BOOLEAN;
BEGIN
  -- Guard: skip if performance_data unchanged
  IF TG_OP = 'UPDATE' AND NEW.performance_data IS NOT DISTINCT FROM OLD.performance_data THEN
    RETURN NEW;
  END IF;

  checkbox_states := NEW.performance_data->'checkboxStates';

  IF checkbox_states IS NULL THEN
    RETURN NEW;
  END IF;

  IF jsonb_object_length(checkbox_states) = 0 THEN
    all_complete := FALSE;
  ELSE
    SELECT NOT EXISTS (
      SELECT 1 FROM jsonb_each_text(checkbox_states) kv
      WHERE kv.value != 'true'
    ) INTO all_complete;
  END IF;

  NEW.completed := all_complete;

  IF all_complete THEN
    IF NEW.completed_at IS NULL THEN
      NEW.completed_at := NOW();
    END IF;
  ELSE
    NEW.completed_at := NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_derive_activity_completion ON public.custom_activity_logs;

CREATE TRIGGER trigger_derive_activity_completion
BEFORE INSERT OR UPDATE
ON public.custom_activity_logs
FOR EACH ROW
EXECUTE FUNCTION public.derive_activity_completion();