ALTER TABLE public.gp_games ADD COLUMN IF NOT EXISTS entry_source text CHECK (entry_source IN ('player_entered','parent_entered','coach_verified','coach_entered','imported','video_tagged','estimated'));
ALTER TABLE public.gp_at_bats ADD COLUMN IF NOT EXISTS entry_source text CHECK (entry_source IN ('player_entered','parent_entered','coach_verified','coach_entered','imported','video_tagged','estimated'));
COMMENT ON COLUMN public.gp_games.entry_source IS 'Who logged this entry. Set by trigger on insert; NULL on rows logged before 2026-10-18 (unknown, never guessed).';
COMMENT ON COLUMN public.gp_at_bats.entry_source IS 'Who logged this entry. Set by trigger on insert; NULL = logged before labels existed.';

CREATE OR REPLACE FUNCTION public.gp_set_entry_source() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  BEGIN
    IF auth.uid() IS NULL THEN
      NEW.entry_source := COALESCE(NEW.entry_source, 'imported');
    ELSIF auth.uid() <> NEW.user_id THEN
      NEW.entry_source := 'coach_entered';
    ELSIF EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = NEW.user_id AND p.parent_controlled IS TRUE) THEN
      NEW.entry_source := 'parent_entered';
    ELSE
      NEW.entry_source := CASE WHEN NEW.entry_source IN ('video_tagged','estimated') THEN NEW.entry_source ELSE 'player_entered' END;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    NULL; -- labeling must never cost a game entry
  END;
  RETURN NEW;
END $$;

CREATE TRIGGER gp_games_entry_source BEFORE INSERT ON public.gp_games FOR EACH ROW EXECUTE FUNCTION public.gp_set_entry_source();
CREATE TRIGGER gp_at_bats_entry_source BEFORE INSERT ON public.gp_at_bats FOR EACH ROW EXECUTE FUNCTION public.gp_set_entry_source();

CREATE OR REPLACE FUNCTION public.gp_mark_coach_verified() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.verified_at IS NOT NULL AND OLD.verified_at IS NULL AND NEW.verified_role IS NOT NULL THEN
    NEW.entry_source := 'coach_verified';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER gp_games_coach_verified BEFORE UPDATE OF verified_at ON public.gp_games FOR EACH ROW EXECUTE FUNCTION public.gp_mark_coach_verified();