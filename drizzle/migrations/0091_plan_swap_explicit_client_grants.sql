REVOKE ALL ON TABLE public.athlete_equipment_memory FROM anon, authenticated;
GRANT SELECT ON TABLE public.athlete_equipment_memory TO authenticated;
GRANT ALL ON TABLE public.athlete_equipment_memory TO service_role;
REVOKE ALL ON TABLE public.plan_swap_log FROM anon, authenticated;
GRANT SELECT ON TABLE public.plan_swap_log TO authenticated;
GRANT ALL ON TABLE public.plan_swap_log TO service_role;