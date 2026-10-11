CREATE POLICY "transcripts own delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'transcripts' AND (storage.foldername(name))[1] = auth.uid()::text);