-- 1. all_checked() helper: strict boolean check, requires non-empty object
CREATE OR REPLACE FUNCTION public.all_checked(cb jsonb)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT cb IS NOT NULL
    AND jsonb_typeof(cb) = 'object'
    AND EXISTS (SELECT 1 FROM jsonb_each(cb))
    AND NOT EXISTS (
      SELECT 1 FROM jsonb_each(cb) kv
      WHERE jsonb_typeof(kv.value) != 'boolean'
         OR (kv.value)::text::boolean IS NOT TRUE
    )
$$;

-- 2. derive_completion_state(): normalize null performance_data at top
CREATE OR REPLACE FUNCTION public.derive_completion_state()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.performance_data IS NULL THEN
    NEW.performance_data := '{}'::jsonb;
  END IF;

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
      THEN 'in_progress' ELSE 'not_started' END;

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

-- 3. validate_completion_intent(): enforce check_all integrity
CREATE OR REPLACE FUNCTION public.validate_completion_intent()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.performance_data IS NOT NULL
     AND NEW.performance_data ? 'checkboxStates'
     AND jsonb_typeof(NEW.performance_data->'checkboxStates') != 'object' THEN
    RAISE EXCEPTION 'checkboxStates must be a JSON object';
  END IF;

  IF TG_OP = 'UPDATE'
     AND OLD.completion_state = 'completed'
     AND NEW.completion_state = 'completed'
     AND OLD.completion_method IS DISTINCT FROM NEW.completion_method THEN
    RAISE EXCEPTION 'Cannot change completion_method after completion';
  END IF;

  IF NEW.completion_state = 'completed' AND NOT (
    NEW.completion_method = 'check_all'
    OR (NEW.completion_method = 'done_button'
        AND public.has_any_checked(NEW.performance_data->'checkboxStates'))
  ) THEN
    RAISE EXCEPTION 'Invalid completion transition: completed state requires check_all or done_button with at least one checked task';
  END IF;

  IF NEW.completion_state = 'completed'
     AND NEW.completion_method = 'check_all'
     AND NOT public.all_checked(NEW.performance_data->'checkboxStates') THEN
    RAISE EXCEPTION 'check_all requires all checkboxes to be true';
  END IF;

  RETURN NEW;
END;
$$;