CREATE TABLE public.problem_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  page text,
  message text NOT NULL,
  app_info jsonb NOT NULL DEFAULT '{}'::jsonb,
  email_status text NOT NULL DEFAULT 'queued',
  email_attempts integer NOT NULL DEFAULT 0,
  email_last_error text,
  email_sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT problem_reports_msg_len CHECK (char_length(message) BETWEEN 1 AND 4000),
  CONSTRAINT problem_reports_status CHECK (email_status IN ('queued','sent','failed'))
);
CREATE INDEX problem_reports_queue ON public.problem_reports (email_status, created_at) WHERE email_status <> 'sent';
GRANT SELECT, INSERT ON public.problem_reports TO authenticated;
GRANT ALL ON public.problem_reports TO service_role;
ALTER TABLE public.problem_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own problem reports insert" ON public.problem_reports FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "own problem reports read" ON public.problem_reports FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "admins read problem reports" ON public.problem_reports FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));