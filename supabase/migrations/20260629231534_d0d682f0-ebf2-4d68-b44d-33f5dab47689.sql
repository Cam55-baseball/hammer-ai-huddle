DROP POLICY IF EXISTS "gp_docs_select_own" ON storage.objects;
DROP POLICY IF EXISTS "gp_docs_insert_own" ON storage.objects;
DROP POLICY IF EXISTS "gp_docs_update_own" ON storage.objects;
DROP POLICY IF EXISTS "gp_docs_delete_own" ON storage.objects;

CREATE POLICY "gp_docs_select_own" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'gp-documents' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "gp_docs_insert_own" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'gp-documents' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "gp_docs_update_own" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'gp-documents' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "gp_docs_delete_own" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'gp-documents' AND (storage.foldername(name))[1] = auth.uid()::text);