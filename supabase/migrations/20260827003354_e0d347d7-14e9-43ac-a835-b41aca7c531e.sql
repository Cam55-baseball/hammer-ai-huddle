CREATE TABLE public.minor_guardian_notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  guardian_email text NOT NULL,
  age_band text NOT NULL,
  status text NOT NULL DEFAULT 'queued',
  notified_at timestamptz,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.minor_guardian_notifications TO service_role;

ALTER TABLE public.minor_guardian_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages guardian notifications"
ON public.minor_guardian_notifications
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE TRIGGER update_minor_guardian_notifications_updated_at
BEFORE UPDATE ON public.minor_guardian_notifications
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();