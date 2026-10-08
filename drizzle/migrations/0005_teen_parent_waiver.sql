CREATE TABLE public.teen_waiver_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teen_user_id uuid NOT NULL UNIQUE,
  kind text NOT NULL CHECK (kind IN ('new','existing')),
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  grace_until timestamptz,
  parent_email text,
  parent_phone text,
  token_hash text,
  token_expires_at timestamptz,
  last_sent_at timestamptz,
  send_count int NOT NULL DEFAULT 0,
  last_reminder_at timestamptz,
  signed_at timestamptz,
  consent_record_id uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.teen_waiver_requests TO authenticated;
GRANT ALL ON public.teen_waiver_requests TO service_role;
ALTER TABLE public.teen_waiver_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "teen reads own waiver request" ON public.teen_waiver_requests FOR SELECT TO authenticated USING (teen_user_id = auth.uid());
CREATE POLICY "staff read waiver requests" ON public.teen_waiver_requests FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'owner') OR public.has_role(auth.uid(),'admin'));
COMMENT ON TABLE public.teen_waiver_requests IS 'legal_v2: 13-17 parent waiver requests. Written only by the teen-parent-waiver function.';