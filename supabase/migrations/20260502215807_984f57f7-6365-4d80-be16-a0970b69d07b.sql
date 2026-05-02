
-- Follower Reports
CREATE TABLE public.follower_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  follower_id UUID NOT NULL,
  player_id UUID NOT NULL,
  follower_role TEXT NOT NULL CHECK (follower_role IN ('scout','coach')),
  report_type TEXT NOT NULL CHECK (report_type IN ('weekly_digest','monthly_deep','milestone')),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  report_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  headline TEXT,
  status TEXT NOT NULL DEFAULT 'ready' CHECK (status IN ('pending','ready','failed')),
  viewed_at TIMESTAMPTZ,
  pdf_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (follower_id, player_id, report_type, period_start)
);

CREATE INDEX idx_follower_reports_follower ON public.follower_reports(follower_id, created_at DESC);
CREATE INDEX idx_follower_reports_player ON public.follower_reports(player_id);
CREATE INDEX idx_follower_reports_unread ON public.follower_reports(follower_id) WHERE viewed_at IS NULL;

ALTER TABLE public.follower_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Followers view own reports"
  ON public.follower_reports FOR SELECT
  USING (auth.uid() = follower_id);

CREATE POLICY "Followers mark own reports viewed"
  ON public.follower_reports FOR UPDATE
  USING (auth.uid() = follower_id)
  WITH CHECK (auth.uid() = follower_id);

CREATE TRIGGER trg_follower_reports_updated
  BEFORE UPDATE ON public.follower_reports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Events
CREATE TABLE public.follower_report_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  follower_id UUID NOT NULL,
  player_id UUID,
  report_id UUID REFERENCES public.follower_reports(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'report_generated','report_viewed','pdf_downloaded',
    'milestone_alert_sent','digest_sent','generation_failed'
  )),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_follower_report_events_follower ON public.follower_report_events(follower_id, created_at DESC);
CREATE INDEX idx_follower_report_events_dedupe ON public.follower_report_events(follower_id, player_id, event_type, created_at DESC);

ALTER TABLE public.follower_report_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Followers view own events"
  ON public.follower_report_events FOR SELECT
  USING (auth.uid() = follower_id);

-- Preferences
CREATE TABLE public.follower_notification_prefs (
  follower_id UUID NOT NULL PRIMARY KEY,
  weekly_digest_enabled BOOLEAN NOT NULL DEFAULT true,
  monthly_per_player_enabled BOOLEAN NOT NULL DEFAULT true,
  milestone_alerts_enabled BOOLEAN NOT NULL DEFAULT true,
  email_enabled BOOLEAN NOT NULL DEFAULT false,
  delivery_hour_local SMALLINT NOT NULL DEFAULT 7 CHECK (delivery_hour_local BETWEEN 0 AND 23),
  timezone TEXT NOT NULL DEFAULT 'UTC',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.follower_notification_prefs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Followers view own prefs"
  ON public.follower_notification_prefs FOR SELECT
  USING (auth.uid() = follower_id);

CREATE POLICY "Followers upsert own prefs"
  ON public.follower_notification_prefs FOR INSERT
  WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Followers update own prefs"
  ON public.follower_notification_prefs FOR UPDATE
  USING (auth.uid() = follower_id)
  WITH CHECK (auth.uid() = follower_id);

CREATE TRIGGER trg_follower_notif_prefs_updated
  BEFORE UPDATE ON public.follower_notification_prefs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Schedule weekly digest cron (Mondays 12:00 UTC)
SELECT cron.schedule(
  'generate-follower-weekly-digests',
  '0 12 * * 1',
  $$
  SELECT net.http_post(
    url := 'https://wysikbsjalfvjwqzkihj.supabase.co/functions/v1/generate-follower-reports',
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'Authorization','Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind5c2lrYnNqYWxmdmp3cXpraWhqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA5OTYyNjAsImV4cCI6MjA3NjU3MjI2MH0.TzgAEk17xlK_qAC4uRHFJTd9SoG5jRNInCUBIuEgA7A'
    ),
    body := jsonb_build_object('mode','weekly_digest')
  );
  $$
);

-- Schedule monthly deep reports check (daily 13:00 UTC)
SELECT cron.schedule(
  'generate-follower-monthly-reports',
  '0 13 * * *',
  $$
  SELECT net.http_post(
    url := 'https://wysikbsjalfvjwqzkihj.supabase.co/functions/v1/generate-follower-reports',
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'Authorization','Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind5c2lrYnNqYWxmdmp3cXpraWhqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA5OTYyNjAsImV4cCI6MjA3NjU3MjI2MH0.TzgAEk17xlK_qAC4uRHFJTd9SoG5jRNInCUBIuEgA7A'
    ),
    body := jsonb_build_object('mode','monthly_deep')
  );
  $$
);
