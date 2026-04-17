-- 1. Strict boolean check in has_any_checked()
CREATE OR REPLACE FUNCTION public.has_any_checked(cb jsonb)
RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE
    WHEN cb IS NULL OR jsonb_typeof(cb) != 'object' THEN FALSE
    ELSE EXISTS (
      SELECT 1 FROM jsonb_each(cb) kv
      WHERE jsonb_typeof(kv.value) = 'boolean' AND (kv.value)::text::boolean IS TRUE
    )
  END
$$;

-- 2. Reaffirm derive_completion_state() with guaranteed completed_at
CREATE OR REPLACE FUNCTION public.derive_completion_state()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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

-- 3. Hardened validate_completion_intent() with shape guard, immutability, and unified transition check
CREATE OR REPLACE FUNCTION public.validate_completion_intent()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Shape guard: checkboxStates must be a JSON object if present
  IF NEW.performance_data IS NOT NULL
     AND NEW.performance_data ? 'checkboxStates'
     AND jsonb_typeof(NEW.performance_data->'checkboxStates') != 'object' THEN
    RAISE EXCEPTION 'checkboxStates must be a JSON object';
  END IF;

  -- Immutable completion_method while completed
  IF TG_OP = 'UPDATE'
     AND OLD.completion_state = 'completed'
     AND NEW.completion_state = 'completed'
     AND OLD.completion_method IS DISTINCT FROM NEW.completion_method THEN
    RAISE EXCEPTION 'Cannot change completion_method after completion';
  END IF;

  -- Unified illegal-transition check (subsumes method='none' and done_button+no-checks)
  IF NEW.completion_state = 'completed' AND NOT (
    NEW.completion_method = 'check_all'
    OR (NEW.completion_method = 'done_button'
        AND public.has_any_checked(NEW.performance_data->'checkboxStates'))
  ) THEN
    RAISE EXCEPTION 'Invalid completion transition: completed state requires check_all or done_button with at least one checked task';
  END IF;

  RETURN NEW;
END;
$$;

-- 4. Partial indexes for in-progress lookups
CREATE INDEX IF NOT EXISTS idx_custom_activity_logs_in_progress
  ON public.custom_activity_logs (user_id, entry_date)
  WHERE completion_state = 'in_progress';

CREATE INDEX IF NOT EXISTS idx_folder_item_completions_in_progress
  ON public.folder_item_completions (user_id, entry_date)
  WHERE completion_state = 'in_progress';