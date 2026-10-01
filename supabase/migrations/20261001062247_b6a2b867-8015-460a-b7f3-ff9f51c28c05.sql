REVOKE EXECUTE ON FUNCTION public.drill_usage_totals() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.drill_usage_totals() TO authenticated;