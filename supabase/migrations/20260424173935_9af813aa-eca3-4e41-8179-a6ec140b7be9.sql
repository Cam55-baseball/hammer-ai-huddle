
-- 1. Add is_system_account flag to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_system_account boolean NOT NULL DEFAULT false;

-- 2. Create dedicated system user in auth.users (idempotent)
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
  is_super_admin, confirmation_token, email_change, email_change_token_new, recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  '00000000-0000-0000-0000-000000000001',
  'authenticated', 'authenticated',
  'system@hammer.internal',
  crypt(gen_random_uuid()::text, gen_salt('bf')),
  now(), now(), now(),
  '{"provider":"system","providers":["system"]}'::jsonb,
  '{"full_name":"System Account","system_account":true}'::jsonb,
  false, '', '', '', ''
) ON CONFLICT (id) DO NOTHING;

-- 3. Seed system profile
INSERT INTO public.profiles (id, full_name, is_system_account)
VALUES ('00000000-0000-0000-0000-000000000001', 'System Account', true)
ON CONFLICT (id) DO UPDATE SET is_system_account = true, full_name = 'System Account';

-- 4. Mark existing adversarial sandbox users as system accounts
UPDATE public.profiles SET is_system_account = true
WHERE id IN (
  '4ef5c027-ad05-447c-8ac5-e99456178447',
  'd5635f4f-0e1c-4b86-b2c0-f7083c60ef3c',
  '582c3840-2f77-4787-8191-7504b31b9960'
);

-- 5. Ensure mpi settings exist for system user
INSERT INTO public.athlete_mpi_settings (user_id, sport)
VALUES ('00000000-0000-0000-0000-000000000001', 'baseball')
ON CONFLICT (user_id) DO NOTHING;

-- 6. Helper: is_system_user(uuid) -> bool
CREATE OR REPLACE FUNCTION public.is_system_user(_uid uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_system_account FROM public.profiles WHERE id = _uid),
    false
  );
$$;

-- 7. Trigger: enforce structural invariants on real users (template_id required, instance_index = 0)
CREATE OR REPLACE FUNCTION public.enforce_real_user_log_invariants()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.is_system_user(NEW.user_id) THEN
    IF NEW.template_id IS NULL THEN
      RAISE EXCEPTION 'custom_activity_logs.template_id cannot be NULL for non-system users (Phase 8 boundary)';
    END IF;
    IF COALESCE(NEW.instance_index, 0) <> 0 THEN
      RAISE EXCEPTION 'custom_activity_logs.instance_index must be 0 for non-system users (Phase 8 boundary)';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_real_user_log_invariants ON public.custom_activity_logs;
CREATE TRIGGER trg_enforce_real_user_log_invariants
BEFORE INSERT OR UPDATE ON public.custom_activity_logs
FOR EACH ROW EXECUTE FUNCTION public.enforce_real_user_log_invariants();

-- 8. Trigger: block synthetic notes patterns on real users
CREATE OR REPLACE FUNCTION public.block_synthetic_notes_for_real_users()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.is_system_user(NEW.user_id) THEN
    IF NEW.notes = 'heartbeat'
       OR NEW.notes LIKE 'kill v3 %'
       OR NEW.notes LIKE 'adversarial:%'
       OR NEW.notes LIKE 'sentinel:%' THEN
      RAISE EXCEPTION 'Synthetic engine notes pattern % is forbidden on real users (Phase 8 boundary)', NEW.notes;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_block_synthetic_notes_for_real_users ON public.custom_activity_logs;
CREATE TRIGGER trg_block_synthetic_notes_for_real_users
BEFORE INSERT OR UPDATE ON public.custom_activity_logs
FOR EACH ROW EXECUTE FUNCTION public.block_synthetic_notes_for_real_users();

-- 9. Cleanup function: delete stale system-user logs (>24h)
CREATE OR REPLACE FUNCTION public.cleanup_synthetic_activity_logs()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE deleted_count integer;
BEGIN
  DELETE FROM public.custom_activity_logs
  WHERE user_id IN (
    SELECT id FROM public.profiles WHERE is_system_account = true
  )
  AND created_at < now() - interval '24 hours';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  IF deleted_count > 0 THEN
    INSERT INTO public.audit_log (user_id, action, table_name, metadata)
    VALUES (
      '00000000-0000-0000-0000-000000000000'::uuid,
      'automated_cleanup',
      'custom_activity_logs',
      jsonb_build_object('deleted_count', deleted_count, 'scope', 'system_accounts', 'retention_hours', 24)
    );
  END IF;
END;
$$;
