-- 1. custom_activity_logs: add completion_state and completion_method
ALTER TABLE public.custom_activity_logs
  ADD COLUMN IF NOT EXISTS completion_state text NOT NULL DEFAULT 'not_started'
    CHECK (completion_state IN ('not_started','in_progress','completed')),
  ADD COLUMN IF NOT EXISTS completion_method text NOT NULL DEFAULT 'none'
    CHECK (completion_method IN ('none','done_button','check_all'));

-- Backfill custom_activity_logs
UPDATE public.custom_activity_logs
SET completion_state = 'completed',
    completion_method = 'check_all'
WHERE completed = true
  AND completion_state = 'not_started';

UPDATE public.custom_activity_logs
SET completion_state = 'in_progress',
    completion_method = 'none'
WHERE completed = false
  AND completion_state = 'not_started'
  AND performance_data ? 'checkboxStates'
  AND EXISTS (
    SELECT 1 FROM jsonb_each_text(performance_data->'checkboxStates') kv
    WHERE kv.value = 'true'
  );

-- 2. folder_item_completions: add same columns
ALTER TABLE public.folder_item_completions
  ADD COLUMN IF NOT EXISTS completion_state text NOT NULL DEFAULT 'not_started'
    CHECK (completion_state IN ('not_started','in_progress','completed')),
  ADD COLUMN IF NOT EXISTS completion_method text NOT NULL DEFAULT 'none'
    CHECK (completion_method IN ('none','done_button','check_all'));

UPDATE public.folder_item_completions
SET completion_state = 'completed',
    completion_method = 'check_all'
WHERE completed = true
  AND completion_state = 'not_started';

UPDATE public.folder_item_completions
SET completion_state = 'in_progress',
    completion_method = 'none'
WHERE completed = false
  AND completion_state = 'not_started'
  AND performance_data IS NOT NULL
  AND performance_data ? 'checkboxStates'
  AND EXISTS (
    SELECT 1 FROM jsonb_each_text(performance_data->'checkboxStates') kv
    WHERE kv.value = 'true'
  );

-- 3. Replace derive_activity_completion with progress-only version
CREATE OR REPLACE FUNCTION public.derive_activity_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  checkbox_states JSONB;
  any_checked BOOLEAN;
BEGIN
  -- Skip if performance_data unchanged on UPDATE
  IF TG_OP = 'UPDATE' AND NEW.performance_data IS NOT DISTINCT FROM OLD.performance_data
     AND NEW.completion_state IS NOT DISTINCT FROM OLD.completion_state
     AND NEW.completion_method IS NOT DISTINCT FROM OLD.completion_method THEN
    RETURN NEW;
  END IF;

  -- Honor explicit completion: if user set state to 'completed', preserve it and mirror to completed flag
  IF NEW.completion_state = 'completed' THEN
    NEW.completed := TRUE;
    IF NEW.completed_at IS NULL THEN
      NEW.completed_at := NOW();
    END IF;
    RETURN NEW;
  END IF;

  -- Otherwise derive in_progress / not_started from checkbox states (progress only)
  checkbox_states := NEW.performance_data->'checkboxStates';

  IF checkbox_states IS NULL OR jsonb_typeof(checkbox_states) != 'object'
     OR jsonb_object_length(checkbox_states) = 0 THEN
    any_checked := FALSE;
  ELSE
    SELECT EXISTS (
      SELECT 1 FROM jsonb_each_text(checkbox_states) kv
      WHERE kv.value = 'true'
    ) INTO any_checked;
  END IF;

  IF any_checked THEN
    NEW.completion_state := 'in_progress';
  ELSE
    NEW.completion_state := 'not_started';
  END IF;
  NEW.completion_method := 'none';
  NEW.completed := FALSE;
  NEW.completed_at := NULL;

  RETURN NEW;
END;
$function$;

-- Ensure trigger exists on custom_activity_logs
DROP TRIGGER IF EXISTS trigger_derive_activity_completion ON public.custom_activity_logs;
CREATE TRIGGER trigger_derive_activity_completion
BEFORE INSERT OR UPDATE ON public.custom_activity_logs
FOR EACH ROW
EXECUTE FUNCTION public.derive_activity_completion();

-- 4. Mirror trigger for folder_item_completions
CREATE OR REPLACE FUNCTION public.derive_folder_item_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  checkbox_states JSONB;
  any_checked BOOLEAN;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.performance_data IS NOT DISTINCT FROM OLD.performance_data
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

  checkbox_states := NEW.performance_data->'checkboxStates';

  IF checkbox_states IS NULL OR jsonb_typeof(checkbox_states) != 'object'
     OR jsonb_object_length(checkbox_states) = 0 THEN
    any_checked := FALSE;
  ELSE
    SELECT EXISTS (
      SELECT 1 FROM jsonb_each_text(checkbox_states) kv
      WHERE kv.value = 'true'
    ) INTO any_checked;
  END IF;

  IF any_checked THEN
    NEW.completion_state := 'in_progress';
  ELSE
    NEW.completion_state := 'not_started';
  END IF;
  NEW.completion_method := 'none';
  NEW.completed := FALSE;
  NEW.completed_at := NULL;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trigger_derive_folder_item_completion ON public.folder_item_completions;
CREATE TRIGGER trigger_derive_folder_item_completion
BEFORE INSERT OR UPDATE ON public.folder_item_completions
FOR EACH ROW
EXECUTE FUNCTION public.derive_folder_item_completion();