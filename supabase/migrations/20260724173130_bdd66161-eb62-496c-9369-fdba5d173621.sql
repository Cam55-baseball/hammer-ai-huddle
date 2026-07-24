
-- Public read of landing-demo bucket (needed so signed URLs and public playback work for visitors)
CREATE POLICY "Public can read landing-demo bucket"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'landing-demo');

CREATE POLICY "Owners can upload landing-demo files"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'landing-demo' AND public.has_role(auth.uid(), 'owner'));

CREATE POLICY "Owners can update landing-demo files"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'landing-demo' AND public.has_role(auth.uid(), 'owner'));

CREATE POLICY "Owners can delete landing-demo files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'landing-demo' AND public.has_role(auth.uid(), 'owner'));
