GRANT SELECT, INSERT, UPDATE, DELETE ON public.athlete_context TO authenticated;
GRANT ALL ON public.athlete_context TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.athlete_mpi_settings TO authenticated;
GRANT ALL ON public.athlete_mpi_settings TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.athlete_side_preferences TO authenticated;
GRANT ALL ON public.athlete_side_preferences TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;