-- Owner-approved Nov 6: add-on purchases (Early 6-Week Recap, Hammers Online x4). Additive only.
ALTER TABLE public.vault_recaps ADD COLUMN IF NOT EXISTS recap_kind text NOT NULL DEFAULT 'regular';

CREATE TABLE public.addon_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  payer_user_id uuid NOT NULL,
  product text NOT NULL CHECK (product IN ('early_recap','online_lessons')),
  channel text NOT NULL CHECK (channel IN ('apple','stripe')),
  external_id text NOT NULL UNIQUE,
  amount_cents integer NOT NULL,
  block_start date,
  status text NOT NULL DEFAULT 'paid',
  delivery_status text NOT NULL DEFAULT 'pending',
  delivery_attempts integer NOT NULL DEFAULT 0,
  recap_id uuid,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX addon_purchases_one_recap_per_block
  ON public.addon_purchases (user_id, block_start) WHERE product = 'early_recap';
GRANT SELECT ON public.addon_purchases TO authenticated;
GRANT ALL ON public.addon_purchases TO service_role;
ALTER TABLE public.addon_purchases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "addon purchases: own or payer or owner" ON public.addon_purchases FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR payer_user_id = auth.uid() OR public.has_role(auth.uid(), 'owner'));

CREATE TABLE public.addon_parent_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_user_id uuid NOT NULL,
  parent_user_id uuid NOT NULL,
  product text NOT NULL CHECK (product IN ('early_recap','online_lessons')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','declined','paid')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.addon_parent_requests TO authenticated;
GRANT ALL ON public.addon_parent_requests TO service_role;
ALTER TABLE public.addon_parent_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "parent requests: read own" ON public.addon_parent_requests FOR SELECT TO authenticated
  USING (athlete_user_id = auth.uid() OR parent_user_id = auth.uid() OR public.has_role(auth.uid(), 'owner'));
CREATE POLICY "parent requests: athlete asks linked parent" ON public.addon_parent_requests FOR INSERT TO authenticated
  WITH CHECK (athlete_user_id = auth.uid() AND status = 'pending' AND EXISTS (
    SELECT 1 FROM public.parent_athlete_links l
    WHERE l.athlete_user_id = auth.uid() AND l.parent_user_id = addon_parent_requests.parent_user_id AND l.status = 'active'));
CREATE POLICY "parent requests: parent declines" ON public.addon_parent_requests FOR UPDATE TO authenticated
  USING (parent_user_id = auth.uid()) WITH CHECK (parent_user_id = auth.uid() AND status IN ('pending','declined'));

CREATE TABLE public.lesson_hours_settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  time_zone text NOT NULL DEFAULT 'America/New_York',
  weekdays integer[] NOT NULL DEFAULT '{1,2,3,4,5}',
  start_minute integer NOT NULL DEFAULT 540,
  end_minute integer NOT NULL DEFAULT 1020,
  min_notice_hours integer NOT NULL DEFAULT 48,
  max_weeks_ahead integer NOT NULL DEFAULT 8,
  lesson_minutes integer NOT NULL DEFAULT 60,
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.lesson_hours_settings (id) VALUES (1) ON CONFLICT DO NOTHING;
GRANT SELECT, UPDATE ON public.lesson_hours_settings TO authenticated;
GRANT ALL ON public.lesson_hours_settings TO service_role;
ALTER TABLE public.lesson_hours_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lesson hours: signed-in read" ON public.lesson_hours_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "lesson hours: owner edits" ON public.lesson_hours_settings FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'owner')) WITH CHECK (public.has_role(auth.uid(), 'owner'));

CREATE TABLE public.lesson_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id uuid NOT NULL UNIQUE REFERENCES public.addon_purchases(id),
  athlete_user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'awaiting_times' CHECK (status IN ('awaiting_times','requested','confirmed')),
  player_time_zone text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.lesson_bookings TO authenticated;
GRANT ALL ON public.lesson_bookings TO service_role;
ALTER TABLE public.lesson_bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lesson bookings: player or owner" ON public.lesson_bookings FOR SELECT TO authenticated
  USING (athlete_user_id = auth.uid() OR public.has_role(auth.uid(), 'owner'));

CREATE TABLE public.lesson_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.lesson_bookings(id),
  lesson_number integer NOT NULL CHECK (lesson_number BETWEEN 1 AND 4),
  start_at timestamptz NOT NULL,
  end_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'requested' CHECK (status IN ('requested','confirmed','reschedule_requested')),
  requested_start_at timestamptz,
  google_event_id text,
  meet_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (booking_id, lesson_number)
);
GRANT SELECT ON public.lesson_sessions TO authenticated;
GRANT ALL ON public.lesson_sessions TO service_role;
ALTER TABLE public.lesson_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lesson sessions: player or owner" ON public.lesson_sessions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'owner') OR EXISTS (
    SELECT 1 FROM public.lesson_bookings b WHERE b.id = lesson_sessions.booking_id AND b.athlete_user_id = auth.uid()));

CREATE TABLE public.addon_notices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  link text,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.addon_notices TO authenticated;
GRANT ALL ON public.addon_notices TO service_role;
ALTER TABLE public.addon_notices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "addon notices: own read" ON public.addon_notices FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "addon notices: own mark read" ON public.addon_notices FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());