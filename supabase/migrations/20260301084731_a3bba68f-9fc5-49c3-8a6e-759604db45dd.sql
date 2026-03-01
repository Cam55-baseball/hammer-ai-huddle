
-- Block 5: Verified stat immutability trigger
CREATE OR REPLACE FUNCTION public.prevent_verified_stat_modification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.admin_verified = true THEN
    IF NEW.url IS DISTINCT FROM OLD.url
       OR NEW.profile_type IS DISTINCT FROM OLD.profile_type THEN
      RAISE EXCEPTION 'Verified stat profiles cannot be modified after admin approval. Revoke admin_verified first.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER prevent_verified_stat_edit
  BEFORE UPDATE ON public.verified_stat_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_verified_stat_modification();

CREATE OR REPLACE FUNCTION public.prevent_verified_stat_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.admin_verified = true THEN
    RAISE EXCEPTION 'Cannot delete admin-verified stat profiles. Revoke admin_verified first.';
  END IF;
  RETURN OLD;
END;
$$;

CREATE TRIGGER prevent_verified_stat_deletion
  BEFORE DELETE ON public.verified_stat_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_verified_stat_delete();

-- Block 6: Coach override write-back
ALTER TABLE public.performance_sessions
  ADD COLUMN IF NOT EXISTS coach_override_applied boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS coach_override_id uuid;

CREATE OR REPLACE FUNCTION public.apply_coach_override_to_session()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.performance_sessions
  SET coach_grade = NEW.override_grade,
      coach_override_applied = true,
      coach_override_id = NEW.id
  WHERE id = NEW.session_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER apply_coach_override
  AFTER INSERT ON public.coach_grade_overrides
  FOR EACH ROW
  EXECUTE FUNCTION public.apply_coach_override_to_session();

-- Block 7: Drop dead fields
ALTER TABLE public.athlete_daily_log
  DROP COLUMN IF EXISTS consistency_impact,
  DROP COLUMN IF EXISTS momentum_impact;
