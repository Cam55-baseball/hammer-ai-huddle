CREATE OR REPLACE FUNCTION public.rating_agreements_fill_sport() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.sport IS NULL OR NEW.sport = 'not_recorded' THEN
    SELECT s.sport::text INTO NEW.sport FROM public.athlete_mpi_settings s WHERE s.user_id = NEW.athlete_id LIMIT 1;
    NEW.sport := COALESCE(NEW.sport, 'not_recorded');
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER rating_agreements_fill_sport BEFORE INSERT ON public.rating_agreements
FOR EACH ROW EXECUTE FUNCTION public.rating_agreements_fill_sport();