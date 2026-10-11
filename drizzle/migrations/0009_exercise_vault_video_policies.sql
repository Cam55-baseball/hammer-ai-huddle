CREATE POLICY "Signed-in users can watch exercise videos"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'exercise-videos');

CREATE POLICY "Owner/admin can upload exercise videos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'exercise-videos' AND (public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'admin')));

CREATE POLICY "Owner/admin can update exercise videos"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'exercise-videos' AND (public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'admin')));

CREATE POLICY "Owner/admin can delete exercise videos"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'exercise-videos' AND (public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'admin')));

CREATE OR REPLACE FUNCTION public.get_exercise_video(_slug text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT v.payload->>'video_url'
  FROM public.exercise_vault_versions v
  WHERE v.slug = _slug AND v.undone_at IS NULL
    AND v.effective_from <= CURRENT_DATE
    AND v.payload->>'video_url' IS NOT NULL
  ORDER BY v.version DESC
  LIMIT 1
$$;

GRANT EXECUTE ON FUNCTION public.get_exercise_video(text) TO authenticated;