CREATE OR REPLACE FUNCTION public.guard_org_verification()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.user_has_role(auth.uid(),'owner'::app_role) OR public.user_has_role(auth.uid(),'admin'::app_role)
     OR auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.verified := false; NEW.verified_by := NULL; NEW.email_verified_at := NULL;
    NEW.email_code_hash := NULL; NEW.email_code_attempts := 0; NEW.reviewed_at := NULL; NEW.review_note := NULL;
    IF NEW.verification_status NOT IN ('unsubmitted','pending') THEN NEW.verification_status := 'unsubmitted'; END IF;
    RETURN NEW;
  END IF;
  IF NEW.verified IS DISTINCT FROM OLD.verified OR NEW.verified_by IS DISTINCT FROM OLD.verified_by
     OR NEW.email_verified_at IS DISTINCT FROM OLD.email_verified_at
     OR NEW.email_code_hash IS DISTINCT FROM OLD.email_code_hash
     OR NEW.email_code_expires_at IS DISTINCT FROM OLD.email_code_expires_at
     OR NEW.email_code_attempts IS DISTINCT FROM OLD.email_code_attempts
     OR NEW.reviewed_at IS DISTINCT FROM OLD.reviewed_at OR NEW.review_note IS DISTINCT FROM OLD.review_note
     OR NEW.is_solo IS DISTINCT FROM OLD.is_solo OR NEW.owner_user_id IS DISTINCT FROM OLD.owner_user_id THEN
    RAISE EXCEPTION 'Only the app owner can change verification';
  END IF;
  IF NEW.verification_status IS DISTINCT FROM OLD.verification_status
     AND NOT (OLD.verification_status IN ('unsubmitted','rejected') AND NEW.verification_status = 'pending') THEN
    RAISE EXCEPTION 'Only the app owner can change verification';
  END IF;
  IF OLD.verification_status = 'verified' AND (NEW.name IS DISTINCT FROM OLD.name OR NEW.official_email IS DISTINCT FROM OLD.official_email) THEN
    NEW.verification_status := 'pending'; NEW.verified := false; NEW.email_verified_at := NULL;
  END IF;
  -- A new official email needs a new code.
  IF NEW.official_email IS DISTINCT FROM OLD.official_email THEN
    NEW.email_verified_at := NULL; NEW.email_code_hash := NULL; NEW.email_code_expires_at := NULL; NEW.email_code_attempts := 0;
  END IF;
  RETURN NEW;
END $$;