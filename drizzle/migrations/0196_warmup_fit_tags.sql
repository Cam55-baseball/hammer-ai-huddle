ALTER TABLE public.owner_drills ADD COLUMN IF NOT EXISTS fit_levels text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.owner_drills ADD COLUMN IF NOT EXISTS fit_age_bands text[] NOT NULL DEFAULT '{}';
COMMENT ON COLUMN public.owner_drills.fit_levels IS 'Warm-up level tags (youth, high_school, college, pro); empty = fits all.';
COMMENT ON COLUMN public.owner_drills.fit_age_bands IS 'Warm-up age-band tags (u13, 13_17, 18_plus); empty = fits all.';

CREATE OR REPLACE FUNCTION public.get_warmup_fit_overrides()
RETURNS TABLE(slug text, levels text[], age_bands text[])
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  select s.slug, s.levels, s.age_bands from (
    select distinct on (v.slug) v.slug,
      array(select jsonb_array_elements_text(case when jsonb_typeof(v.payload->'fit_levels')='array' then v.payload->'fit_levels' else '[]'::jsonb end)) as levels,
      array(select jsonb_array_elements_text(case when jsonb_typeof(v.payload->'fit_age_bands')='array' then v.payload->'fit_age_bands' else '[]'::jsonb end)) as age_bands
    from exercise_vault_versions v
    where v.undone_at is null and v.effective_from <= current_date
    order by v.slug, v.version desc
  ) s
  where cardinality(s.levels) > 0 and cardinality(s.age_bands) > 0
$$;
REVOKE ALL ON FUNCTION public.get_warmup_fit_overrides() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_warmup_fit_overrides() TO authenticated, service_role;