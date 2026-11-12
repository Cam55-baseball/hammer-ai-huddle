-- Owner-approved Nov 12 (build 13 fix 4): which iPhone build and which screens each signed-in person
-- last opened. One row per user and platform, latest wins. The person writes only their own row
-- (through record_app_build_seen, which uses auth.uid()); owner/admin can read. Additive only.
CREATE TABLE public.app_build_seen (
  user_id uuid NOT NULL,
  platform text NOT NULL,
  app_version text,
  app_build text,
  web_built_at timestamptz,
  seen_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, platform),
  CONSTRAINT app_build_seen_platform_check CHECK (platform IN ('ios', 'android', 'web'))
);

GRANT SELECT ON public.app_build_seen TO authenticated;
GRANT ALL ON public.app_build_seen TO service_role;
ALTER TABLE public.app_build_seen ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner and admin read app builds seen" ON public.app_build_seen
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'owner'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE OR REPLACE FUNCTION public.record_app_build_seen(
  _platform text, _app_version text DEFAULT NULL, _app_build text DEFAULT NULL, _web_built_at timestamptz DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not signed in'; END IF;
  IF _platform IS NULL OR _platform NOT IN ('ios', 'android', 'web') THEN RAISE EXCEPTION 'invalid platform'; END IF;
  INSERT INTO public.app_build_seen (user_id, platform, app_version, app_build, web_built_at, seen_at)
  VALUES (auth.uid(), _platform, left(_app_version, 40), left(_app_build, 40), _web_built_at, now())
  ON CONFLICT (user_id, platform) DO UPDATE
    SET app_version = EXCLUDED.app_version,
        app_build = EXCLUDED.app_build,
        web_built_at = EXCLUDED.web_built_at,
        seen_at = now();
END $$;

REVOKE ALL ON FUNCTION public.record_app_build_seen(text, text, text, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_app_build_seen(text, text, text, timestamptz) TO authenticated;
