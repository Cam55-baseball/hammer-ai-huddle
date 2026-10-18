ALTER TABLE public.gp_pitches ADD COLUMN IF NOT EXISTS contact_quality text CHECK(contact_quality IN ('weak','medium','hard','barrel','mishit')), ADD COLUMN IF NOT EXISTS spray_bucket text CHECK(spray_bucket IN ('pull_air','pull_ground','center_air','center_ground','oppo_air','oppo_ground')), ADD COLUMN IF NOT EXISTS hard_hit boolean, ADD COLUMN IF NOT EXISTS intent_location jsonb;
COMMENT ON COLUMN public.gp_pitches.contact_quality IS 'Logger-entered contact description, not a measured exit speed. NULL means not entered; historical notes are not parsed.';
COMMENT ON COLUMN public.gp_pitches.spray_bucket IS 'Logger-entered direction and flight description. NULL means not entered.';
COMMENT ON COLUMN public.gp_pitches.hard_hit IS 'Logger observation: true=yes, false=no, NULL=not entered. Never a measured hard-hit threshold.';
COMMENT ON COLUMN public.gp_pitches.intent_location IS 'Logger-tapped intended zone, separate from actual location; NULL means not entered.';
CREATE OR REPLACE FUNCTION public.gp_set_entry_source() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  BEGIN
    IF auth.uid() IS NULL THEN
      NEW.entry_source := COALESCE(NEW.entry_source, 'imported');
    ELSIF auth.uid() <> NEW.user_id THEN
      NEW.entry_source := 'coach_entered';
    ELSIF NEW.entry_source IN ('imported','estimated') THEN
      NULL;
    ELSIF EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = NEW.user_id AND p.parent_controlled IS TRUE) THEN
      NEW.entry_source := 'parent_entered';
    ELSE
      NEW.entry_source := CASE WHEN NEW.entry_source = 'video_tagged' THEN NEW.entry_source ELSE 'player_entered' END;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  RETURN NEW;
END $$;
COMMENT ON FUNCTION public.gp_set_entry_source() IS 'Server logger attribution; preserves self-declared unverified import/estimate. Video evidence validator remains mandatory. No verified-coach exception.';