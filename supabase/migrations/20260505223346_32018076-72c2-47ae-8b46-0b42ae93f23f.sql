CREATE TABLE public.demo_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  email text NOT NULL,
  sim_id text,
  severity text,
  gap text,
  pct integer,
  from_slug text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.demo_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone can insert demo leads"
  ON public.demo_leads FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "owners read their leads"
  ON public.demo_leads FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE INDEX demo_leads_email_idx ON public.demo_leads(email);
CREATE INDEX demo_leads_created_idx ON public.demo_leads(created_at DESC);