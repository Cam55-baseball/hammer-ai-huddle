
CREATE OR REPLACE FUNCTION public.derive_activity_completion()
RETURNS TRIGGER AS $$
DECLARE
  all_complete BOOLEAN;
BEGIN
  IF NEW.performance_data->'checkboxStates' IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT NOT EXISTS (
    SELECT 1
    FROM jsonb_each_text(NEW.performance_data->'checkboxStates') kv
    WHERE kv.value != 'true'
  ) INTO all_complete;

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

CREATE TRIGGER trigger_derive_activity_completion
BEFORE INSERT OR UPDATE OF performance_data
ON public.custom_activity_logs
FOR EACH ROW
EXECUTE FUNCTION public.derive_activity_completion();
