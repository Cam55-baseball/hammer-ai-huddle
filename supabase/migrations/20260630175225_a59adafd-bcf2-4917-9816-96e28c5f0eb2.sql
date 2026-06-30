
CREATE POLICY "gp dossier videos: own folder read" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'gp-dossier-videos' AND (auth.uid())::text = (storage.foldername(name))[1]);
CREATE POLICY "gp dossier videos: own folder write" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'gp-dossier-videos' AND (auth.uid())::text = (storage.foldername(name))[1]);
CREATE POLICY "gp dossier videos: own folder update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'gp-dossier-videos' AND (auth.uid())::text = (storage.foldername(name))[1]);
CREATE POLICY "gp dossier videos: own folder delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'gp-dossier-videos' AND (auth.uid())::text = (storage.foldername(name))[1]);
