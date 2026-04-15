CREATE OR REPLACE FUNCTION public.validate_wrong_explanations_completeness()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  opt RECORD;
BEGIN
  IF NEW.answer_options IS NULL OR NEW.wrong_explanations IS NULL OR NEW.correct_answer_id IS NULL THEN
    RETURN NEW;
  END IF;

  FOR opt IN SELECT ao->>'id' AS opt_id
             FROM jsonb_array_elements(NEW.answer_options) ao
             WHERE ao->>'id' != NEW.correct_answer_id
  LOOP
    IF NOT (NEW.wrong_explanations::jsonb ? opt.opt_id) THEN
      RAISE EXCEPTION 'wrong_explanations missing key "%" for scenario %', opt.opt_id, NEW.id;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_wrong_explanations
  BEFORE INSERT OR UPDATE ON public.baserunning_scenarios
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_wrong_explanations_completeness();