CREATE OR REPLACE FUNCTION public.has_any_checked(cb JSONB)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN cb IS NULL OR jsonb_typeof(cb) != 'object' THEN FALSE
    ELSE EXISTS (SELECT 1 FROM jsonb_each_text(cb) kv WHERE kv.value = 'true')
  END
$$;

CREATE OR REPLACE FUNCTION public.derive_completion_state()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE'
     AND NEW.performance_data IS NOT DISTINCT FROM OLD.performance_data
     AND NEW.completion_state IS NOT DISTINCT FROM OLD.completion_state
     AND NEW.completion_method IS NOT DISTINCT FROM OLD.completion_method THEN
    RETURN NEW;
  END IF;

  IF NEW.completion_state = 'completed' THEN
    NEW.completed := TRUE;
    IF NEW.completed_at IS NULL THEN
      NEW.completed_at := NOW();
    END IF;
    RETURN NEW;
  END IF;

  NEW.completion_state := CASE
    WHEN public.has_any_checked(NEW.performance_data->'checkboxStates')
      THEN 'in_progress'
      ELSE 'not_started'
  END;

  IF TG_OP = 'UPDATE'
     AND OLD.completion_state = 'completed'
     AND NEW.completion_state != 'completed' THEN
    NEW.completion_method := 'none';
    NEW.completed_at := NULL;
  END IF;

  NEW.completed := (NEW.completion_state = 'completed');

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_completion_intent()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.completion_state = 'completed' THEN
    IF NEW.completion_method = 'none' OR NEW.completion_method IS NULL THEN
      RAISE EXCEPTION 'Completed state requires a valid completion_method (done_button or check_all)';
    END IF;
    IF NEW.completion_method = 'done_button'
       AND NOT public.has_any_checked(NEW.performance_data->'checkboxStates') THEN
      RAISE EXCEPTION 'Cannot mark done_button completion with no checked tasks';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;