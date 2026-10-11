CREATE OR REPLACE FUNCTION public.get_warmup_stage_overrides()
RETURNS TABLE(slug text, stage integer, stage_order integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  select distinct on (v.slug) v.slug,
         nullif(v.payload->>'warmup_stage','')::int,
         nullif(v.payload->>'warmup_stage_order','')::int
  from exercise_vault_versions v
  where v.undone_at is null and v.effective_from <= current_date
  order by v.slug, v.version desc
$$;
REVOKE ALL ON FUNCTION public.get_warmup_stage_overrides() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_warmup_stage_overrides() TO authenticated;