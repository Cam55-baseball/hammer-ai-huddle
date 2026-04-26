DROP VIEW IF EXISTS public.library_videos_readiness;

CREATE VIEW public.library_videos_readiness
WITH (security_invoker = on) AS
SELECT
  v.id AS video_id,
  v.owner_id,
  (v.video_format IS NOT NULL) AS has_format,
  (v.skill_domains IS NOT NULL AND array_length(v.skill_domains, 1) >= 1) AS has_domain,
  (v.ai_description IS NOT NULL AND length(trim(v.ai_description)) > 0) AS has_description,
  COALESCE(a.assignment_count, 0)::int AS assignment_count,
  (
    v.video_format IS NOT NULL
    AND v.skill_domains IS NOT NULL AND array_length(v.skill_domains, 1) >= 1
    AND v.ai_description IS NOT NULL AND length(trim(v.ai_description)) > 0
    AND COALESCE(a.assignment_count, 0) >= 2
  ) AS is_ready,
  ARRAY(
    SELECT m FROM unnest(ARRAY[
      CASE WHEN v.video_format IS NULL THEN 'video_format' END,
      CASE WHEN v.skill_domains IS NULL OR array_length(v.skill_domains, 1) IS NULL THEN 'skill_domains' END,
      CASE WHEN v.ai_description IS NULL OR length(trim(v.ai_description)) = 0 THEN 'ai_description' END,
      CASE WHEN COALESCE(a.assignment_count, 0) < 2 THEN 'tag_assignments' END
    ]) AS m WHERE m IS NOT NULL
  ) AS missing_fields
FROM public.library_videos v
LEFT JOIN (
  SELECT video_id, COUNT(*) AS assignment_count
  FROM public.video_tag_assignments
  GROUP BY video_id
) a ON a.video_id = v.id;

GRANT SELECT ON public.library_videos_readiness TO authenticated;