

# DB-Level Validation: wrong_explanations Key Completeness

## Current State
- All 232 scenarios currently have correct `wrong_explanations` keys matching their non-correct `answer_options` IDs
- Zero integrity violations exist today
- Dev-mode `console.warn` catches mismatches at runtime
- Semantic similarity sweep confirms zero near-duplicates after rewrites

## What's Missing
No DB-level enforcement prevents future inserts/updates from having incomplete `wrong_explanations`. A scenario could be added with missing keys and the only guard is a browser console warning.

## Implementation

**Single migration**: Add a validation trigger that fires on INSERT and UPDATE to `baserunning_scenarios`. It checks that every non-correct `answer_options` ID exists as a key in `wrong_explanations`.

```sql
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
```

**Logic**: If `answer_options`, `wrong_explanations`, and `correct_answer_id` are all non-null, every answer option ID that is NOT the correct answer must exist as a key in `wrong_explanations`. Missing keys raise an exception and block the write.

Rows where any of the three fields are null pass through (backward compat for any legacy path).

## Semantic Similarity Results

Verified the top 15 highest-overlap pairs. The highest pair (`e2300003` vs `e2400003`) teaches completely different concepts:
- **e2300003**: Dead-ball overthrow rule — where was the runner at time of throw?
- **e2400003**: Reading CF depth to take an extra base on a deflected grounder

All pairs share common baseball vocabulary ("runners on", "the batter hits") but teach distinct decisions. **Zero semantic duplicates remain.**

## Summary
- 1 migration (trigger + function)
- 0 data changes
- 0 code changes

