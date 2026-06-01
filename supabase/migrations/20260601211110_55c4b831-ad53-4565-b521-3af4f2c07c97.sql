-- Phase D — parent invite transport log + safeguarding notification log.
-- Both tables are append-only alert/transport state. Neither stores
-- organism truth; canonical truth remains the relational.* event stream.

CREATE TABLE public.parent_invite_dispatches (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  relationship_id uuid NOT NULL,
  athlete_id uuid NOT NULL,
  recipient_email text NOT NULL,
  status text NOT NULL DEFAULT 'queued',
  attempt_count integer NOT NULL DEFAULT 0,
  last_error text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_parent_invite_dispatches_athlete
  ON public.parent_invite_dispatches (athlete_id, created_at DESC);
CREATE INDEX idx_parent_invite_dispatches_relationship
  ON public.parent_invite_dispatches (relationship_id);

GRANT SELECT, INSERT, UPDATE ON public.parent_invite_dispatches TO authenticated;
GRANT ALL ON public.parent_invite_dispatches TO service_role;

ALTER TABLE public.parent_invite_dispatches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "athletes read own invite dispatches"
  ON public.parent_invite_dispatches
  FOR SELECT
  TO authenticated
  USING (auth.uid() = athlete_id);

CREATE POLICY "athletes insert own invite dispatches"
  ON public.parent_invite_dispatches
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = athlete_id);

CREATE POLICY "athletes update own invite dispatches"
  ON public.parent_invite_dispatches
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = athlete_id);

-- ─── safeguarding_notifications ────────────────────────────────────────────

CREATE TABLE public.safeguarding_notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  athlete_id uuid NOT NULL,
  source_event_id text NOT NULL,
  route text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  reasons text[] NOT NULL DEFAULT ARRAY[]::text[],
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Append-only dedupe: same source event + route + status only once.
CREATE UNIQUE INDEX uq_safeguarding_notif_dedupe
  ON public.safeguarding_notifications (athlete_id, source_event_id, route, status);

CREATE INDEX idx_safeguarding_notif_athlete
  ON public.safeguarding_notifications (athlete_id, created_at DESC);

GRANT SELECT, INSERT ON public.safeguarding_notifications TO authenticated;
GRANT ALL ON public.safeguarding_notifications TO service_role;

ALTER TABLE public.safeguarding_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "athletes read own safety notifications"
  ON public.safeguarding_notifications
  FOR SELECT
  TO authenticated
  USING (auth.uid() = athlete_id);

CREATE POLICY "athletes append own safety notifications"
  ON public.safeguarding_notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = athlete_id);

-- Trigger to maintain updated_at on parent_invite_dispatches.
CREATE OR REPLACE FUNCTION public.touch_parent_invite_dispatches()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_parent_invite_dispatches_updated_at
  BEFORE UPDATE ON public.parent_invite_dispatches
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_parent_invite_dispatches();