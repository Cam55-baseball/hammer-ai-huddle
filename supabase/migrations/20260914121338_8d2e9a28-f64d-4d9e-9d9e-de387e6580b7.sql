CREATE POLICY "Users read own pose landmarks"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'pose-landmarks' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users insert own pose landmarks"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'pose-landmarks' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users update own pose landmarks"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'pose-landmarks' AND auth.uid()::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'pose-landmarks' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users delete own pose landmarks"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'pose-landmarks' AND auth.uid()::text = (storage.foldername(name))[1]);