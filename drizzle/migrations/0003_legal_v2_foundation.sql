CREATE TABLE public.legal_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL,
  version integer NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  effective_date date,
  approved boolean NOT NULL DEFAULT false,
  approved_at timestamptz,
  approved_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (slug, version)
);
GRANT SELECT ON public.legal_documents TO anon, authenticated;
GRANT INSERT, UPDATE ON public.legal_documents TO authenticated;
GRANT ALL ON public.legal_documents TO service_role;
ALTER TABLE public.legal_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "legal docs readable" ON public.legal_documents FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "staff insert legal docs" ON public.legal_documents FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'owner') OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "staff update legal docs" ON public.legal_documents FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'owner') OR public.has_role(auth.uid(),'admin'));

CREATE TABLE public.consent_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  document_slug text NOT NULL,
  document_version integer NOT NULL,
  choice text NOT NULL CHECK (choice IN ('accepted','declined','withdrawn','signed','cancelled')),
  method text NOT NULL,
  signer_name text,
  signer_role text,
  subject_user_id uuid,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  ip text,
  device text,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  account_ended_at timestamptz
);
COMMENT ON TABLE public.consent_records IS 'Append-only legal consent log. Keep at least 3 years after account_ended_at. Never in delete-account OWNED_TABLES.';
CREATE INDEX consent_records_user_idx ON public.consent_records (user_id, document_slug, recorded_at DESC);
GRANT SELECT ON public.consent_records TO authenticated;
GRANT ALL ON public.consent_records TO service_role;
ALTER TABLE public.consent_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own consent read" ON public.consent_records FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'owner') OR public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.consent_records_append_only() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'consent_records are append-only'; END IF;
  IF NEW.id <> OLD.id OR NEW.user_id <> OLD.user_id OR NEW.document_slug <> OLD.document_slug
     OR NEW.document_version <> OLD.document_version OR NEW.choice <> OLD.choice OR NEW.recorded_at <> OLD.recorded_at THEN
    RAISE EXCEPTION 'consent_records are append-only (only account_ended_at may be set)';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER consent_records_append_only BEFORE UPDATE OR DELETE ON public.consent_records
  FOR EACH ROW EXECUTE FUNCTION public.consent_records_append_only();

CREATE TABLE public.privacy_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('export','delete','withdraw_consent','correct','other')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','done','denied')),
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  requested_at timestamptz NOT NULL DEFAULT now(),
  due_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  completed_at timestamptz,
  owner_notes text
);
GRANT SELECT, INSERT ON public.privacy_requests TO authenticated;
GRANT UPDATE ON public.privacy_requests TO authenticated;
GRANT ALL ON public.privacy_requests TO service_role;
ALTER TABLE public.privacy_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own privacy requests read" ON public.privacy_requests FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'owner') OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "own privacy requests insert" ON public.privacy_requests FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND status = 'open');
CREATE POLICY "staff privacy requests update" ON public.privacy_requests FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'owner') OR public.has_role(auth.uid(),'admin'));