-- 1. Unified derive function (shared by custom_activity_logs + folder_item_completions)
CREATE OR REPLACE FUNCTION public.derive_completion_state()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  checkbox_states JSONB;
  any_checked BOOLEAN;
BEGIN
  -- Skip when nothing relevant changed
  IF TG_OP = 'UPDATE'
     AND NEW.performance_data IS NOT DISTINCT FROM OLD.performance_data
     AND NEW.completion_state IS NOT DISTINCT FROM OLD.completion_state
     AND NEW.completion_method IS NOT DISTINCT FROM OLD.completion_method THEN
    RETURN NEW;
  END IF;

  -- HONOR USER INTENT: if state is completed, do not touch method or completed_at
  IF NEW.completion_state = 'completed' THEN
    NEW.completed := TRUE;
    IF NEW.completed_at IS NULL THEN
      NEW.completed_at := NOW();
    END IF;
    RETURN NEW;
  END IF;

  -- State is not completed → derive in_progress / not_started from checkbox states
  checkbox_states := NEW.performance_data->'checkboxStates';
  IF checkbox_states IS NULL OR jsonb_typeof(checkbox_states) != 'object'
     OR jsonb_object_length(checkbox_states) = 0 THEN
    any_checked := FALSE;
  ELSE
    SELECT EXISTS (
      SELECT 1 FROM jsonb_each_text(checkbox_states) kv WHERE kv.value = 'true'
    ) INTO any_checked;
  END IF;

  NEW.completion_state := CASE WHEN any_checked THEN 'in_progress' ELSE 'not_started' END;

  -- Only reset method + completed_at when transitioning OUT of completed
  IF TG_OP = 'UPDATE' AND OLD.completion_state = 'completed' THEN
    NEW.completion_method := 'none';
    NEW.completed_at := NULL;
  END IF;
  NEW.completed := FALSE;

  RETURN NEW;
END;
$$;

-- 2. Validation: reject done_button completion with zero checked tasks
CREATE OR REPLACE FUNCTION public.validate_completion_intent()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  any_checked BOOLEAN;
  cb JSONB;
BEGIN
  IF NEW.completion_state = 'completed' AND NEW.completion_method = 'done_button' THEN
    cb := NEW.performance_data->'checkboxStates';
    IF cb IS NULL OR jsonb_typeof(cb) != 'object' OR jsonb_object_length(cb) = 0 THEN
      any_checked := FALSE;
    ELSE
      SELECT EXISTS (
        SELECT 1 FROM jsonb_each_text(cb) kv WHERE kv.value = 'true'
      ) INTO any_checked;
    END IF;
    IF NOT any_checked THEN
      RAISE EXCEPTION 'Cannot mark done_button completion with no checked tasks';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- 3. Drop old per-table triggers + functions, rebind to unified function
DROP TRIGGER IF EXISTS derive_activity_completion_trigger ON public.custom_activity_logs;
DROP TRIGGER IF EXISTS derive_folder_item_completion_trigger ON public.folder_item_completions;
DROP TRIGGER IF EXISTS trigger_derive_activity_completion ON public.custom_activity_logs;
DROP TRIGGER IF EXISTS trigger_derive_folder_item_completion ON public.folder_item_completions;
DROP FUNCTION IF EXISTS public.derive_activity_completion();
DROP FUNCTION IF EXISTS public.derive_folder_item_completion();

CREATE TRIGGER derive_completion_state_trigger
  BEFORE INSERT OR UPDATE ON public.custom_activity_logs
  FOR EACH ROW EXECUTE FUNCTION public.derive_completion_state();

CREATE TRIGGER derive_completion_state_trigger
  BEFORE INSERT OR UPDATE ON public.folder_item_completions
  FOR EACH ROW EXECUTE FUNCTION public.derive_completion_state();

CREATE TRIGGER validate_completion_intent_trigger
  BEFORE INSERT OR UPDATE ON public.custom_activity_logs
  FOR EACH ROW EXECUTE FUNCTION public.validate_completion_intent();

CREATE TRIGGER validate_completion_intent_trigger
  BEFORE INSERT OR UPDATE ON public.folder_item_completions
  FOR EACH ROW EXECUTE FUNCTION public.validate_completion_intent();

-- 4. GIN indexes for fast checkboxStates lookups
CREATE INDEX IF NOT EXISTS idx_custom_activity_logs_checkbox_states
  ON public.custom_activity_logs USING GIN ((performance_data->'checkboxStates'));
CREATE INDEX IF NOT EXISTS idx_folder_item_completions_checkbox_states
  ON public.folder_item_completions USING GIN ((performance_data->'checkboxStates'));