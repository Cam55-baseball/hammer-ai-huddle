ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS account_paused_at timestamptz,
  ADD COLUMN IF NOT EXISTS paused_reason text;

CREATE OR REPLACE FUNCTION public.is_account_paused(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT account_paused_at IS NOT NULL FROM public.profiles WHERE id = _user_id), false)
$$;

-- Invoker on purpose: current_user is 'authenticated' only for app clients.
CREATE OR REPLACE FUNCTION public.guard_profile_age_fields()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  is_client boolean := current_user = 'authenticated';
  staff boolean := false;
BEGIN
  IF is_client THEN
    staff := public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner');
  END IF;
  IF NEW.date_of_birth IS NOT NULL AND NEW.date_of_birth > current_date THEN
    RAISE EXCEPTION 'birthdate_in_future' USING ERRCODE = '22007';
  END IF;
  IF is_client AND NOT staff THEN
    IF TG_OP = 'UPDATE' THEN
      IF OLD.date_of_birth IS NOT NULL AND NEW.date_of_birth IS DISTINCT FROM OLD.date_of_birth THEN
        RAISE EXCEPTION 'birthdate_locked' USING ERRCODE = '42501';
      END IF;
      NEW.account_paused_at := OLD.account_paused_at;
      NEW.paused_reason := OLD.paused_reason;
    ELSE
      NEW.account_paused_at := NULL;
      NEW.paused_reason := NULL;
    END IF;
  END IF;
  IF NEW.date_of_birth IS NOT NULL
     AND date_part('year', age(current_date, NEW.date_of_birth))::int < 13
     AND NEW.account_paused_at IS NULL THEN
    NEW.account_paused_at := now();
    NEW.paused_reason := 'under_13';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_guard_profile_age_fields ON public.profiles;
CREATE TRIGGER trg_guard_profile_age_fields
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_profile_age_fields();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  raw_dob text := NEW.raw_user_meta_data->>'date_of_birth';
  dob date := NULL;
BEGIN
  IF raw_dob ~ '^\d{4}-\d{2}-\d{2}$' THEN
    BEGIN dob := raw_dob::date; EXCEPTION WHEN others THEN dob := NULL; END;
    IF dob > current_date THEN dob := NULL; END IF;
  END IF;
  INSERT INTO public.profiles (id, full_name, date_of_birth)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', dob);
  INSERT INTO public.athlete_mpi_settings (user_id, sport) VALUES (NEW.id, 'baseball');
  RETURN NEW;
END $$;

DROP POLICY IF EXISTS "Paused accounts are hidden from others" ON public.profiles;
CREATE POLICY "Paused accounts are hidden from others" ON public.profiles
  AS RESTRICTIVE FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR account_paused_at IS NULL
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'owner')
  );

DROP POLICY IF EXISTS "Paused accounts cannot upload" ON storage.objects;
CREATE POLICY "Paused accounts cannot upload" ON storage.objects
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (NOT public.is_account_paused(auth.uid()));

REVOKE EXECUTE ON FUNCTION public.is_account_paused(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.is_account_paused(uuid) TO authenticated, service_role;