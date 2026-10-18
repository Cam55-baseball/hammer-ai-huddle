ALTER TABLE public.gp_at_bats ADD COLUMN IF NOT EXISTS source_video_id uuid REFERENCES public.videos(id), ADD COLUMN IF NOT EXISTS source_video_seconds numeric CHECK(source_video_seconds>=0);
CREATE OR REPLACE FUNCTION public.tag_at_bat_video(_ab uuid,_video uuid,_seconds numeric)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE clip_duration numeric;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in first.' USING ERRCODE='42501'; END IF;
 IF _seconds IS NULL OR _seconds<0 OR _seconds::text IN ('NaN','Infinity','-Infinity') THEN RAISE EXCEPTION 'Choose a valid clip time.'; END IF;
 PERFORM 1 FROM public.gp_at_bats a JOIN public.gp_games g ON g.id=a.game_id WHERE a.id=_ab AND a.user_id=auth.uid() AND g.user_id=auth.uid() AND g.deleted_at IS NULL FOR UPDATE OF a;
 IF NOT FOUND THEN RAISE EXCEPTION 'This at-bat is not available.' USING ERRCODE='42501'; END IF;
 SELECT duration_sec INTO clip_duration FROM public.videos WHERE id=_video AND user_id=auth.uid();
 IF NOT FOUND THEN RAISE EXCEPTION 'Choose one of your saved clips.' USING ERRCODE='42501'; END IF;
 IF clip_duration IS NOT NULL AND _seconds>clip_duration THEN RAISE EXCEPTION 'That time is past the end of the clip.'; END IF;
 UPDATE public.gp_at_bats SET source_video_id=_video,source_video_seconds=_seconds,entry_source='video_tagged' WHERE id=_ab AND user_id=auth.uid();
END $$;
REVOKE ALL ON FUNCTION public.tag_at_bat_video(uuid,uuid,numeric) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.tag_at_bat_video(uuid,uuid,numeric) TO authenticated;
COMMENT ON COLUMN public.gp_at_bats.source_video_id IS 'Clip used by the player to tag this event; not a claim of AI verification.';
CREATE OR REPLACE FUNCTION public.gp_validate_video_tag() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NEW.entry_source='video_tagged' THEN
  IF NEW.source_video_id IS NULL OR NEW.source_video_seconds IS NULL OR NEW.source_video_seconds<0 OR NEW.source_video_seconds::text IN ('NaN','Infinity','-Infinity') OR NOT EXISTS(SELECT 1 FROM public.videos v WHERE v.id=NEW.source_video_id AND v.user_id=NEW.user_id AND (v.duration_sec IS NULL OR NEW.source_video_seconds<=v.duration_sec)) THEN
   RAISE EXCEPTION 'Video-tagged entries need your saved clip and a valid time.';
  END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER gp_at_bats_video_evidence BEFORE INSERT OR UPDATE OF entry_source,source_video_id,source_video_seconds ON public.gp_at_bats FOR EACH ROW EXECUTE FUNCTION public.gp_validate_video_tag();