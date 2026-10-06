INSERT INTO public.wk_feature_switches (feature_key, label, mode, allowlist, buildable, sort_order)
SELECT 'under13_parent_program', 'Under-13 parent-controlled accounts', 'off', '{}', true, COALESCE(max(sort_order),0)+1 FROM public.wk_feature_switches
ON CONFLICT (feature_key) DO NOTHING;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS parent_controlled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS parent_consent_ok boolean NOT NULL DEFAULT false;

CREATE TABLE public.consent_texts (
  kind text NOT NULL CHECK (kind IN ('parent_promise','parent_notice')),
  version integer NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (kind, version)
);
GRANT SELECT ON public.consent_texts TO anon, authenticated;
GRANT ALL ON public.consent_texts TO service_role;
ALTER TABLE public.consent_texts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read consent texts" ON public.consent_texts FOR SELECT USING (true);

CREATE TABLE public.parent_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_user_id uuid NOT NULL,
  parent_full_name text NOT NULL,
  relationship text NOT NULL,
  parent_birthdate date NOT NULL,
  parent_is_adult boolean NOT NULL,
  parent_email text NOT NULL,
  child_display_name text NOT NULL,
  typed_name text NOT NULL,
  signature_path text NOT NULL,
  promise_version integer NOT NULL,
  notice_version integer NOT NULL,
  promise_text text NOT NULL,
  signed_at timestamptz NOT NULL DEFAULT now(),
  ip text,
  user_agent text,
  stripe_payment_id text,
  payment_confirmed_at timestamptz,
  optional_sharing boolean NOT NULL DEFAULT false,
  optional_sharing_at timestamptz,
  withdrawn_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX parent_consents_child_idx ON public.parent_consents(child_user_id, signed_at DESC);
GRANT SELECT ON public.parent_consents TO authenticated;
GRANT ALL ON public.parent_consents TO service_role;
ALTER TABLE public.parent_consents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Account holder reads own consent" ON public.parent_consents FOR SELECT TO authenticated USING (child_user_id = auth.uid());
CREATE POLICY "Owners and admins read consents" ON public.parent_consents FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'owner') OR public.has_role(auth.uid(),'admin'));

CREATE TABLE public.child_data_deletions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_user_id uuid NOT NULL,
  consent_id uuid,
  removed jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.child_data_deletions TO authenticated;
GRANT ALL ON public.child_data_deletions TO service_role;
ALTER TABLE public.child_data_deletions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Account holder reads own deletions" ON public.child_data_deletions FOR SELECT TO authenticated USING (child_user_id = auth.uid());
CREATE POLICY "Owners and admins read deletions" ON public.child_data_deletions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'owner') OR public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.guard_profile_age_fields()
 RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $function$
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
      NEW.parent_controlled := OLD.parent_controlled;
      NEW.parent_consent_ok := OLD.parent_consent_ok;
    ELSE
      NEW.account_paused_at := NULL;
      NEW.paused_reason := NULL;
      NEW.parent_controlled := false;
      NEW.parent_consent_ok := false;
    END IF;
  END IF;
  IF NEW.date_of_birth IS NOT NULL
     AND date_part('year', age(current_date, NEW.date_of_birth))::int < 13
     AND NOT NEW.parent_consent_ok
     AND NEW.account_paused_at IS NULL THEN
    NEW.account_paused_at := now();
    NEW.paused_reason := 'under_13';
  END IF;
  RETURN NEW;
END $function$;

CREATE OR REPLACE FUNCTION public.is_under_13(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT date_of_birth IS NOT NULL AND date_part('year', age(current_date, date_of_birth))::int < 13
                   FROM public.profiles WHERE id = _user_id), false)
$$;
REVOKE EXECUTE ON FUNCTION public.is_under_13(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_under_13(uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS "Paused accounts are hidden from others" ON public.profiles;
CREATE POLICY "Paused and under-13 accounts are hidden from others" ON public.profiles AS RESTRICTIVE FOR SELECT
  USING (id = auth.uid()
         OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner')
         OR (account_paused_at IS NULL
             AND NOT (date_of_birth IS NOT NULL AND date_part('year', age(current_date, date_of_birth))::int < 13)));

CREATE OR REPLACE FUNCTION public.block_under13_patterns()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF public.is_under_13(NEW.user_id) THEN RETURN NULL; END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_block_under13_patterns ON public.user_behavior_patterns;
CREATE TRIGGER trg_block_under13_patterns BEFORE INSERT OR UPDATE ON public.user_behavior_patterns
  FOR EACH ROW EXECUTE FUNCTION public.block_under13_patterns();

INSERT INTO public.consent_texts (kind, version, body) VALUES
('parent_promise', 1, 'I am the parent or legal guardian of [child''s name] and I am 18 or older. I will be the only person who controls this account; my child will use Hammers Modality only under my supervision. I give permission for Hammers Modality to collect and use my child''s information as described in the Parent Notice to build and run my child''s training. I can review or delete my child''s information, or take back this permission, at any time. Everything I entered is true.'),
('parent_notice', 1, E'What we collect about your child: first name or nickname, date of birth, height, weight and body measurements, sport, position and team, training logs and check-ins (sleep, water, nutrition, recovery, how they feel), and training videos with body-movement analysis.\n\nWhy: only to build and run your child''s daily training plan and show progress.\n\nWho it is shared with: Google AI and OpenAI (only to produce the analysis; never to train their models), Stripe (your card payment), Resend (emails to you), and our hosting provider. We never sell it.\n\nProtections: your child is hidden from scouts, recruiters, search, leaderboards and public pages; cannot message adults; all emails and notifications go to you; and your child''s data is never used to train any model or added to our own pattern libraries.\n\nYour controls: in Settings you can view your signed promise, see what is stored, delete your child''s data, or take back permission (this locks the account at once). Optional sharing (for example PitchLab) needs its own separate yes, off by default.')
ON CONFLICT DO NOTHING;