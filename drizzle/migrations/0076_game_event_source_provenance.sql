ALTER TABLE public.gp_pitches ADD COLUMN IF NOT EXISTS entry_source text CHECK(entry_source IN ('player_entered','parent_entered','coach_entered','imported','estimated'));
ALTER TABLE public.gp_defense_plays ADD COLUMN IF NOT EXISTS entry_source text CHECK(entry_source IN ('player_entered','parent_entered','coach_entered','imported','estimated'));
ALTER TABLE public.gp_baserun_events ADD COLUMN IF NOT EXISTS entry_source text CHECK(entry_source IN ('player_entered','parent_entered','coach_entered','imported','estimated'));
CREATE OR REPLACE FUNCTION public.gp_event_source() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF TG_OP='UPDATE' THEN
  NEW.entry_source:=OLD.entry_source;
 ELSIF auth.uid() IS NULL THEN
  NEW.entry_source:='imported';
 ELSIF auth.uid()<>NEW.user_id THEN
  NEW.entry_source:='coach_entered';
 ELSIF NEW.entry_source IN ('imported','estimated') THEN
  NULL;
 ELSIF EXISTS(SELECT 1 FROM public.profiles WHERE id=NEW.user_id AND parent_controlled IS TRUE) THEN
  NEW.entry_source:='parent_entered';
 ELSE
  NEW.entry_source:='player_entered';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER gp_pitches_event_source BEFORE INSERT OR UPDATE ON public.gp_pitches FOR EACH ROW EXECUTE FUNCTION public.gp_event_source();
CREATE TRIGGER gp_defense_event_source BEFORE INSERT OR UPDATE ON public.gp_defense_plays FOR EACH ROW EXECUTE FUNCTION public.gp_event_source();
CREATE TRIGGER gp_baserun_event_source BEFORE INSERT OR UPDATE ON public.gp_baserun_events FOR EACH ROW EXECUTE FUNCTION public.gp_event_source();
COMMENT ON COLUMN public.gp_pitches.entry_source IS 'Server-attributed logger or self-declared unverified import/estimate. Immutable on update. Historical NULL stays unknown; no video or coach-verification claim.';
COMMENT ON COLUMN public.gp_defense_plays.entry_source IS 'Server-attributed logger or self-declared unverified import/estimate. Immutable on update. Historical NULL stays unknown.';
COMMENT ON COLUMN public.gp_baserun_events.entry_source IS 'Server-attributed logger or self-declared unverified import/estimate. Immutable on update. Historical NULL stays unknown.';
REVOKE ALL ON FUNCTION public.gp_event_source() FROM PUBLIC,anon,authenticated;