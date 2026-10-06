REVOKE EXECUTE ON FUNCTION public.is_under_13(uuid) FROM authenticated;
CREATE OR REPLACE FUNCTION public.block_under13_patterns()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = NEW.user_id AND p.date_of_birth IS NOT NULL
             AND date_part('year', age(current_date, p.date_of_birth))::int < 13) THEN
    RETURN NULL;
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.block_under13_patterns() FROM PUBLIC, anon, authenticated;