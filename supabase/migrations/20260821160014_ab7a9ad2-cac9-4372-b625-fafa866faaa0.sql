DROP VIEW IF EXISTS public.library_videos_readiness;

CREATE VIEW public.library_videos_readiness
WITH (security_invoker = true)
AS
SELECT
  v.id AS video_id,
  v.owner_id,
  COALESCE(v.video_class, 'application') AS video_class,
  v.video_format IS NOT NULL AS has_format,
  (v.skill_domains IS NOT NULL AND array_length(v.skill_domains, 1) >= 1) AS has_domain,
  (v.ai_description IS NOT NULL AND length(btrim(v.ai_description)) > 0) AS has_description,
  COALESCE(a.assignment_count, 0)::integer AS assignment_count,
  CASE
    WHEN COALESCE(v.video_class, 'application') = 'foundation' THEN
      COALESCE(v.foundation_meta->>'domain', '') <> ''
      AND COALESCE(v.foundation_meta->>'scope', '') <> ''
      AND jsonb_typeof(COALESCE(v.foundation_meta->'audience_levels', '[]'::jsonb)) = 'array'
      AND jsonb_array_length(COALESCE(v.foundation_meta->'audience_levels', '[]'::jsonb)) > 0
      AND jsonb_typeof(COALESCE(v.foundation_meta->'refresher_triggers', '[]'::jsonb)) = 'array'
      AND jsonb_array_length(COALESCE(v.foundation_meta->'refresher_triggers', '[]'::jsonb)) > 0
      AND v.ai_description IS NOT NULL AND length(btrim(v.ai_description)) > 0
    ELSE
      v.video_format IS NOT NULL
      AND v.skill_domains IS NOT NULL AND array_length(v.skill_domains, 1) >= 1
      AND v.ai_description IS NOT NULL AND length(btrim(v.ai_description)) > 0
      AND COALESCE(a.assignment_count, 0) >= 2
  END AS is_ready,
  CASE WHEN COALESCE(v.video_class, 'application') = 'foundation' THEN
    ARRAY(SELECT m FROM unnest(ARRAY[
      CASE WHEN COALESCE(v.foundation_meta->>'domain','') = '' THEN 'foundation_domain' END,
      CASE WHEN COALESCE(v.foundation_meta->>'scope','') = '' THEN 'foundation_scope' END,
      CASE WHEN jsonb_typeof(COALESCE(v.foundation_meta->'audience_levels','[]'::jsonb)) <> 'array'
             OR jsonb_array_length(COALESCE(v.foundation_meta->'audience_levels','[]'::jsonb)) = 0
           THEN 'foundation_audience' END,
      CASE WHEN jsonb_typeof(COALESCE(v.foundation_meta->'refresher_triggers','[]'::jsonb)) <> 'array'
             OR jsonb_array_length(COALESCE(v.foundation_meta->'refresher_triggers','[]'::jsonb)) = 0
           THEN 'foundation_triggers' END,
      CASE WHEN v.ai_description IS NULL OR length(btrim(v.ai_description)) = 0 THEN 'ai_description' END
    ]) m WHERE m IS NOT NULL)
  ELSE
    ARRAY(SELECT m FROM unnest(ARRAY[
      CASE WHEN v.video_format IS NULL THEN 'video_format' END,
      CASE WHEN v.skill_domains IS NULL OR array_length(v.skill_domains, 1) IS NULL THEN 'skill_domains' END,
      CASE WHEN v.ai_description IS NULL OR length(btrim(v.ai_description)) = 0 THEN 'ai_description' END,
      CASE WHEN COALESCE(a.assignment_count, 0) < 2 THEN 'tag_assignments' END
    ]) m WHERE m IS NOT NULL)
  END AS missing_fields
FROM public.library_videos v
LEFT JOIN (
  SELECT video_id, count(*) AS assignment_count
  FROM public.video_tag_assignments
  GROUP BY video_id
) a ON a.video_id = v.id;

GRANT SELECT ON public.library_videos_readiness TO authenticated;
GRANT SELECT ON public.library_videos_readiness TO service_role;