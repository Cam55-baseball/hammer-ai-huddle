CREATE OR REPLACE FUNCTION public.validate_wrong_explanations_completeness()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  opt RECORD;
  expected_count INT;
  actual_count INT;
BEGIN
  -- Enforce exactly 4 answer options
  IF NEW.answer_options IS NOT NULL THEN
    IF jsonb_array_length(NEW.answer_options) != 4 THEN
      RAISE EXCEPTION 'answer_options must have exactly 4 entries, got % for scenario %',
        jsonb_array_length(NEW.answer_options), NEW.id;
    END IF;
  END IF;

  -- Skip explanation check if any field is null
  IF NEW.answer_options IS NULL OR NEW.wrong_explanations IS NULL OR NEW.correct_answer_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Check every incorrect option ID exists in wrong_explanations
  expected_count := 0;
  FOR opt IN SELECT ao->>'id' AS opt_id
             FROM jsonb_array_elements(NEW.answer_options) ao
             WHERE ao->>'id' != NEW.correct_answer_id
  LOOP
    IF NOT (NEW.wrong_explanations::jsonb ? opt.opt_id) THEN
      RAISE EXCEPTION 'wrong_explanations missing key "%" for scenario %', opt.opt_id, NEW.id;
    END IF;
    expected_count := expected_count + 1;
  END LOOP;

  -- Check no extra keys exist
  SELECT count(*) INTO actual_count
  FROM jsonb_object_keys(NEW.wrong_explanations::jsonb);

  IF actual_count != expected_count THEN
    RAISE EXCEPTION 'wrong_explanations has % keys but expected % for scenario %',
      actual_count, expected_count, NEW.id;
  END IF;

  RETURN NEW;
END;
$$;