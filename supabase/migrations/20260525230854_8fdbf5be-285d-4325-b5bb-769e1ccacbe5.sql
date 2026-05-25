
-- Additive tables for Backlog #4 + #5 (athlete daily operating loop).
-- No changes to asb_events / asb_event_lineage. No writes outside owner.

CREATE TABLE IF NOT EXISTS public.notification_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  in_app boolean NOT NULL DEFAULT true,
  email boolean NOT NULL DEFAULT false,
  push boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user reads own notification preferences"
  ON public.notification_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "user inserts own notification preferences"
  ON public.notification_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user updates own notification preferences"
  ON public.notification_preferences FOR UPDATE
  USING (auth.uid() = user_id);

-- Append-only acknowledgement / dispatch log. No UPDATE policy (immutable per row).
CREATE TABLE IF NOT EXISTS public.notification_acks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id uuid NOT NULL,
  channel text NOT NULL CHECK (channel IN ('in_app','email','push')),
  dispatched_at timestamptz NOT NULL DEFAULT now(),
  acknowledged_at timestamptz,
  UNIQUE (user_id, event_id, channel)
);

ALTER TABLE public.notification_acks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user reads own notification acks"
  ON public.notification_acks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "user inserts own notification acks"
  ON public.notification_acks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Allow updating only acknowledged_at on own rows (additive ack stamp; row otherwise immutable).
CREATE POLICY "user updates own notification ack ack-stamp"
  ON public.notification_acks FOR UPDATE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_notification_acks_user_event
  ON public.notification_acks (user_id, event_id);
