CREATE OR REPLACE FUNCTION public.can_view_avatar_object(_viewer uuid, _name text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT (storage.foldername(_name))[1] !~ '^[0-9a-f-]{36}$'
      OR NOT public.is_under_13(((storage.foldername(_name))[1])::uuid)
      OR public.can_view_athlete_media(_viewer, ((storage.foldername(_name))[1])::uuid);
$$;
REVOKE ALL ON FUNCTION public.can_view_avatar_object(uuid, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.can_view_avatar_object(uuid, text) TO authenticated, service_role;
DROP POLICY IF EXISTS "Signed-in read avatars, under-13 restricted" ON storage.objects;
CREATE POLICY "Signed-in read avatars, under-13 restricted" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'avatars' AND public.can_view_avatar_object(auth.uid(), name));