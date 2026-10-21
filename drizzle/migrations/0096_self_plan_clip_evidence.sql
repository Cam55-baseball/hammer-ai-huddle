CREATE OR REPLACE FUNCTION public.get_my_plan_clip_evidence(p_sport text)
RETURNS TABLE(id uuid, user_id uuid, sport text, module text, created_at timestamptz, violations jsonb)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT v.id, v.user_id, v.sport::text, v.module::text, v.created_at,
    (SELECT jsonb_object_agg(a.key, a.value) FROM jsonb_each(
       CASE WHEN jsonb_typeof(v.ai_analysis->'violations_detected') = 'object'
         THEN v.ai_analysis->'violations_detected' ELSE '{}'::jsonb END) a
     WHERE jsonb_typeof(a.value) = 'boolean' AND a.key IN
       ('early_shoulder_rotation', 'hands_pass_elbow_early', 'front_shoulder_opens_early', 'shoulders_not_aligned', 'back_leg_not_facing_target'))
  FROM public.videos v
  WHERE auth.uid() IS NOT NULL AND v.user_id = auth.uid()
    AND p_sport IN ('baseball', 'softball') AND v.sport::text = p_sport AND v.status::text = 'completed'
  ORDER BY v.created_at DESC, v.id DESC LIMIT 501;
$$;
REVOKE ALL ON FUNCTION public.get_my_plan_clip_evidence(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_plan_clip_evidence(text) TO authenticated, service_role;
COMMENT ON FUNCTION public.get_my_plan_clip_evidence(text) IS 'Self-only canonical clip metadata and assessed boolean fault answers for Today; no scores, measurements or free text, no cross-athlete input.';