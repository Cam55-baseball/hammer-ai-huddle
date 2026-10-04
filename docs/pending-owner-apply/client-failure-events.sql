-- PENDING OWNER APPROVAL — not applied.
-- Durable diagnostic trail for failed video saves (and other client failures).
-- Signed-in users may only add rows about themselves; only owner/admin can read them.
CREATE TABLE public.client_failure_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  ref text NOT NULL,
  surface text NOT NULL,
  module text,
  db_code text,
  db_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.client_failure_events TO authenticated;
GRANT SELECT ON public.client_failure_events TO authenticated;
GRANT ALL ON public.client_failure_events TO service_role;
ALTER TABLE public.client_failure_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users log their own failures" ON public.client_failure_events
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Owner and admin read failures" ON public.client_failure_events
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'admin'));
