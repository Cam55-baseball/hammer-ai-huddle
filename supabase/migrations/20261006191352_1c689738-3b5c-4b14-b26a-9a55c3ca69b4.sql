ALTER TABLE public.vault_progress_photos ADD COLUMN IF NOT EXISTS height_inches numeric;

CREATE OR REPLACE FUNCTION public.progress_photo_requires_height()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.height_inches IS NULL OR NEW.height_inches < 36 OR NEW.height_inches > 96 THEN
    RAISE EXCEPTION 'height_required' USING ERRCODE = '23502';
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.progress_photo_log_height()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.athlete_height_checks (user_id, measured_on, inches, source)
  VALUES (NEW.user_id, COALESCE(NEW.photo_date, current_date), NEW.height_inches, 'progress_photo')
  ON CONFLICT (user_id, measured_on) DO UPDATE SET inches = EXCLUDED.inches, source = EXCLUDED.source;
  UPDATE public.profiles SET height_inches = NEW.height_inches
   WHERE id = NEW.user_id AND height_inches IS DISTINCT FROM NEW.height_inches;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.progress_photo_log_height() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_progress_photo_requires_height ON public.vault_progress_photos;
CREATE TRIGGER trg_progress_photo_requires_height BEFORE INSERT ON public.vault_progress_photos
  FOR EACH ROW EXECUTE FUNCTION public.progress_photo_requires_height();
DROP TRIGGER IF EXISTS trg_progress_photo_log_height ON public.vault_progress_photos;
CREATE TRIGGER trg_progress_photo_log_height AFTER INSERT ON public.vault_progress_photos
  FOR EACH ROW EXECUTE FUNCTION public.progress_photo_log_height();