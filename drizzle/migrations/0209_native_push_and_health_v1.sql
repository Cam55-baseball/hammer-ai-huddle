-- Release A (owner-approved Nov 8): iPhone push tokens, push fan-out outbox, Apple Health sample columns.

-- 1. Device tokens (one row per iPhone token; the owner of the row is whoever is signed in on that phone).
CREATE TABLE public.push_device_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  token text NOT NULL UNIQUE,
  platform text NOT NULL DEFAULT 'ios' CHECK (platform IN ('ios')),
  apns_env text CHECK (apns_env IN ('production', 'sandbox')),
  app_version text,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  disabled_at timestamptz,
  disabled_reason text,
  last_error text
);
CREATE INDEX push_device_tokens_active_user_idx ON public.push_device_tokens (user_id) WHERE disabled_at IS NULL;

GRANT SELECT ON public.push_device_tokens TO authenticated;
GRANT ALL ON public.push_device_tokens TO service_role;
ALTER TABLE public.push_device_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own push tokens" ON public.push_device_tokens
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Writes only through these two functions (a phone that changes account moves its token to the new account).
CREATE OR REPLACE FUNCTION public.register_push_token(_token text, _app_version text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not signed in'; END IF;
  IF _token IS NULL OR _token !~ '^[0-9A-Fa-f]{32,256}$' THEN RAISE EXCEPTION 'invalid token'; END IF;
  INSERT INTO public.push_device_tokens (user_id, token, app_version)
  VALUES (auth.uid(), lower(_token), left(_app_version, 40))
  ON CONFLICT (token) DO UPDATE
    SET user_id = auth.uid(),
        app_version = COALESCE(left(EXCLUDED.app_version, 40), public.push_device_tokens.app_version),
        last_seen_at = now(),
        disabled_at = NULL,
        disabled_reason = NULL;
END $$;

CREATE OR REPLACE FUNCTION public.disable_push_token(_token text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR _token IS NULL THEN RETURN; END IF;
  UPDATE public.push_device_tokens
     SET disabled_at = now(), disabled_reason = 'signed_out'
   WHERE token = lower(_token) AND user_id = auth.uid() AND disabled_at IS NULL;
END $$;

REVOKE ALL ON FUNCTION public.register_push_token(text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.disable_push_token(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.register_push_token(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.disable_push_token(text) TO authenticated;

-- 2. Outbox: one row per in-app notification that should also go to phones. No personal content stored here;
--    send-push reads the original notification row. Server-only.
CREATE TABLE public.push_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_table text NOT NULL,
  source_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sending', 'sent', 'skipped', 'failed')),
  attempts integer NOT NULL DEFAULT 0,
  result jsonb,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  UNIQUE (source_table, source_id)
);
GRANT ALL ON public.push_outbox TO service_role;
ALTER TABLE public.push_outbox ENABLE ROW LEVEL SECURITY;

-- 3. Fan-out trigger. Never blocks or fails the original notification.
CREATE OR REPLACE FUNCTION public.push_enqueue()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid;
BEGIN
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.wk_feature_switches WHERE feature_key = 'native_push_v1' AND mode IN ('self', 'pilot', 'all')) THEN
      RETURN NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.push_device_tokens WHERE disabled_at IS NULL) THEN
      RETURN NULL;
    END IF;
    IF TG_TABLE_NAME IN ('connection_requests', 'addon_parent_requests') AND NEW.status IS DISTINCT FROM 'pending' THEN
      RETURN NULL;
    END IF;
    INSERT INTO public.push_outbox (source_table, source_id)
    VALUES (TG_TABLE_NAME, NEW.id)
    ON CONFLICT (source_table, source_id) DO NOTHING
    RETURNING id INTO v_id;
    IF v_id IS NOT NULL THEN
      PERFORM net.http_post(
        url := 'https://wysikbsjalfvjwqzkihj.supabase.co/functions/v1/send-push',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind5c2lrYnNqYWxmdmp3cXpraWhqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA5OTYyNjAsImV4cCI6MjA3NjU3MjI2MH0.TzgAEk17xlK_qAC4uRHFJTd9SoG5jRNInCUBIuEgA7A'
        ),
        body := jsonb_build_object('outbox_id', v_id),
        timeout_milliseconds := 15000
      );
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'push_enqueue skipped for %: %', TG_TABLE_NAME, SQLERRM;
  END;
  RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION public.push_enqueue() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER push_enqueue_coach_notifications AFTER INSERT ON public.coach_notifications FOR EACH ROW EXECUTE FUNCTION public.push_enqueue();
CREATE TRIGGER push_enqueue_addon_notices AFTER INSERT ON public.addon_notices FOR EACH ROW EXECUTE FUNCTION public.push_enqueue();
CREATE TRIGGER push_enqueue_coach_messages AFTER INSERT ON public.coach_messages FOR EACH ROW EXECUTE FUNCTION public.push_enqueue();
CREATE TRIGGER push_enqueue_coach_prescriptions AFTER INSERT ON public.coach_prescriptions FOR EACH ROW EXECUTE FUNCTION public.push_enqueue();
CREATE TRIGGER push_enqueue_addon_parent_requests AFTER INSERT ON public.addon_parent_requests FOR EACH ROW EXECUTE FUNCTION public.push_enqueue();
CREATE TRIGGER push_enqueue_connection_requests AFTER INSERT ON public.connection_requests FOR EACH ROW EXECUTE FUNCTION public.push_enqueue();

-- 4. Apple Health samples (additive columns; readiness math unchanged).
ALTER TABLE public.wearable_metrics
  ADD COLUMN IF NOT EXISTS sample_id text,
  ADD COLUMN IF NOT EXISTS metric text,
  ADD COLUMN IF NOT EXISTS in_bed_min integer,
  ADD COLUMN IF NOT EXISTS device_name text,
  ADD COLUMN IF NOT EXISTS ended_at timestamptz;
ALTER TABLE public.wearable_metrics
  ADD CONSTRAINT wearable_metrics_user_sample_key UNIQUE (user_id, sample_id);
COMMENT ON COLUMN public.wearable_metrics.sample_id IS 'Apple Health sample UUID; dedupes repeated syncs per user.';