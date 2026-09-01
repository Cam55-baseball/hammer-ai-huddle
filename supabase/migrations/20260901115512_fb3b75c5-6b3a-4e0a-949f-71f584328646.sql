ALTER TABLE public.vault_scout_grades ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE public.vault_scout_grades
  ADD COLUMN IF NOT EXISTS prospect_name text,
  ADD COLUMN IF NOT EXISTS prospect_team text,
  ADD COLUMN IF NOT EXISTS prospect_grad_year integer,
  ADD COLUMN IF NOT EXISTS prospect_position text,
  ADD COLUMN IF NOT EXISTS prospect_contact text,
  ADD COLUMN IF NOT EXISTS linked_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS linked_by uuid;

COMMENT ON COLUMN public.vault_scout_grades.prospect_name IS
  'Set only while the report is unlinked (user_id IS NULL): the prospect this report is about.';

CREATE OR REPLACE FUNCTION public.enforce_scout_grade_subject()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Every report must be about someone.
  IF NEW.user_id IS NULL AND coalesce(btrim(NEW.prospect_name), '') = '' THEN
    RAISE EXCEPTION 'A report with no athlete account must carry a prospect name';
  END IF;

  -- Only official evaluator-filed reports may exist without an account.
  IF NEW.user_id IS NULL AND NEW.grade_source IS DISTINCT FROM 'coach_evaluated' THEN
    RAISE EXCEPTION 'Only scout/coach evaluations can be filed without an athlete account';
  END IF;

  IF TG_OP = 'UPDATE' THEN
    -- A report already attached to an athlete can never be moved to another one.
    IF OLD.user_id IS NOT NULL AND NEW.user_id IS DISTINCT FROM OLD.user_id THEN
      RAISE EXCEPTION 'A report already linked to an athlete cannot be reassigned';
    END IF;

    -- Linking a prospect report to a real athlete: stamp provenance and send it
    -- back through the athlete's attendance confirmation gate.
    IF OLD.user_id IS NULL AND NEW.user_id IS NOT NULL THEN
      NEW.linked_at := now();
      NEW.linked_by := auth.uid();
      NEW.player_confirmed := false;
      NEW.player_confirmed_at := NULL;
      NEW.player_rejected := false;
      NEW.player_rejected_at := NULL;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_scout_grade_subject ON public.vault_scout_grades;
CREATE TRIGGER enforce_scout_grade_subject
  BEFORE INSERT OR UPDATE ON public.vault_scout_grades
  FOR EACH ROW EXECUTE FUNCTION public.enforce_scout_grade_subject();

CREATE INDEX IF NOT EXISTS idx_vsg_unlinked_prospects
  ON public.vault_scout_grades (evaluator_id, graded_at DESC)
  WHERE user_id IS NULL;