CREATE OR REPLACE FUNCTION public.initial_assessments_lock_verifier()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF coalesce(auth.role(),'') <> 'service_role' THEN
    IF TG_OP = 'INSERT' THEN
      NEW.recorded_by := NULL; NEW.recorded_by_label := NULL;
    ELSE
      NEW.recorded_by := OLD.recorded_by; NEW.recorded_by_label := OLD.recorded_by_label;
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER initial_assessments_lock_verifier BEFORE INSERT OR UPDATE ON public.initial_assessments
FOR EACH ROW EXECUTE FUNCTION public.initial_assessments_lock_verifier();