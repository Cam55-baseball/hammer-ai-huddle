-- STEP 1: Drop existing triggers (correct names from pg_trigger audit)
DROP TRIGGER IF EXISTS validate_completion_intent_trigger ON public.custom_activity_logs;
DROP TRIGGER IF EXISTS derive_completion_state_trigger ON public.custom_activity_logs;
DROP TRIGGER IF EXISTS validate_completion_intent_trigger ON public.folder_item_completions;
DROP TRIGGER IF EXISTS derive_completion_state_trigger ON public.folder_item_completions;

-- Also drop the prefixed names in case partial prior migration left any
DROP TRIGGER IF EXISTS trg_01_validate_completion_intent ON public.custom_activity_logs;
DROP TRIGGER IF EXISTS trg_02_derive_completion_state ON public.custom_activity_logs;
DROP TRIGGER IF EXISTS trg_01_validate_completion_intent ON public.folder_item_completions;
DROP TRIGGER IF EXISTS trg_02_derive_completion_state ON public.folder_item_completions;

-- STEP 2: Backfill missing completed_at
UPDATE public.custom_activity_logs
SET completed_at = COALESCE(created_at, NOW())
WHERE completion_state = 'completed' AND completed_at IS NULL;

UPDATE public.folder_item_completions
SET completed_at = NOW()
WHERE completion_state = 'completed' AND completed_at IS NULL;

-- STEP 3: Repair legacy check_all rows that don't satisfy all_checked()
-- 3a. No checkboxes true → seed legacy marker + reclassify to done_button
UPDATE public.custom_activity_logs
SET performance_data = jsonb_set(
      COALESCE(performance_data, '{}'::jsonb),
      '{checkboxStates,_legacy_completed}',
      'true'::jsonb,
      true
    ),
    completion_method = 'done_button'
WHERE completion_state = 'completed'
  AND completion_method = 'check_all'
  AND NOT public.has_any_checked(performance_data->'checkboxStates');

-- 3b. Partially checked → reclassify to done_button
UPDATE public.custom_activity_logs
SET completion_method = 'done_button'
WHERE completion_state = 'completed'
  AND completion_method = 'check_all'
  AND public.has_any_checked(performance_data->'checkboxStates')
  AND NOT public.all_checked(performance_data->'checkboxStates');

-- Same defensive repair on folder_item_completions
UPDATE public.folder_item_completions
SET performance_data = jsonb_set(
      COALESCE(performance_data, '{}'::jsonb),
      '{checkboxStates,_legacy_completed}',
      'true'::jsonb,
      true
    ),
    completion_method = 'done_button'
WHERE completion_state = 'completed'
  AND completion_method = 'check_all'
  AND NOT public.has_any_checked(performance_data->'checkboxStates');

UPDATE public.folder_item_completions
SET completion_method = 'done_button'
WHERE completion_state = 'completed'
  AND completion_method = 'check_all'
  AND public.has_any_checked(performance_data->'checkboxStates')
  AND NOT public.all_checked(performance_data->'checkboxStates');

-- STEP 4: Re-bind triggers with deterministic alphabetical ordering
-- trg_01_* fires before trg_02_*, so validate runs FIRST then derive.
CREATE TRIGGER trg_01_validate_completion_intent
  BEFORE INSERT OR UPDATE ON public.custom_activity_logs
  FOR EACH ROW EXECUTE FUNCTION public.validate_completion_intent();

CREATE TRIGGER trg_02_derive_completion_state
  BEFORE INSERT OR UPDATE ON public.custom_activity_logs
  FOR EACH ROW EXECUTE FUNCTION public.derive_completion_state();

CREATE TRIGGER trg_01_validate_completion_intent
  BEFORE INSERT OR UPDATE ON public.folder_item_completions
  FOR EACH ROW EXECUTE FUNCTION public.validate_completion_intent();

CREATE TRIGGER trg_02_derive_completion_state
  BEFORE INSERT OR UPDATE ON public.folder_item_completions
  FOR EACH ROW EXECUTE FUNCTION public.derive_completion_state();