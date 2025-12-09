-- Fix function search path security warning
CREATE OR REPLACE FUNCTION validate_sleep_quality()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.sleep_quality IS NOT NULL AND (NEW.sleep_quality < 1 OR NEW.sleep_quality > 5) THEN
    RAISE EXCEPTION 'sleep_quality must be between 1 and 5';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;