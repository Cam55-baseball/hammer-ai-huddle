
-- Gap #1: Create a safe public view for profile names (excludes PII)
CREATE VIEW public.profiles_public
WITH (security_invoker = on) AS
SELECT id, full_name, avatar_url, position, experience_level
FROM public.profiles;

-- Allow authenticated users to read from the base table
-- through the view (security_invoker means the view runs as the calling user)
CREATE POLICY "Authenticated users can view basic profile info"
ON public.profiles FOR SELECT TO authenticated
USING (true);

-- Gap #2: Auto-create athlete_mpi_settings on new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');

  INSERT INTO public.athlete_mpi_settings (user_id, sport)
  VALUES (NEW.id, 'baseball');

  RETURN NEW;
END;
$$;
