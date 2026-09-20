-- 1. weakness_scores: the "service" policy was open to every client role.
DROP POLICY IF EXISTS "Service can manage weakness scores" ON public.weakness_scores;
CREATE POLICY "Service role manages weakness scores"
  ON public.weakness_scores FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- 2. promo-videos storage: write policies were open to the public role.
DROP POLICY IF EXISTS "Service role can upload promo videos" ON storage.objects;
DROP POLICY IF EXISTS "Service role can update promo videos" ON storage.objects;
DROP POLICY IF EXISTS "Service role can delete promo videos" ON storage.objects;
CREATE POLICY "Service role uploads promo videos"
  ON storage.objects FOR INSERT TO service_role
  WITH CHECK (bucket_id = 'promo-videos');
CREATE POLICY "Service role updates promo videos"
  ON storage.objects FOR UPDATE TO service_role
  USING (bucket_id = 'promo-videos') WITH CHECK (bucket_id = 'promo-videos');
CREATE POLICY "Service role deletes promo videos"
  ON storage.objects FOR DELETE TO service_role
  USING (bucket_id = 'promo-videos');
-- admins may also curate promo videos from the app
CREATE POLICY "Admins upload promo videos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'promo-videos' AND public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins update promo videos"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'promo-videos' AND public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (bucket_id = 'promo-videos' AND public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins delete promo videos"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'promo-videos' AND public.has_role(auth.uid(), 'admin'::app_role));

-- 3. records: no access control at all.
ALTER TABLE public.records ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.records TO authenticated;
GRANT ALL ON public.records TO service_role;
CREATE POLICY "Signed-in users read records"
  ON public.records FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage records"
  ON public.records FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- 4. scale_reference: public benchmark values, read-only, admin writes.
ALTER TABLE public.scale_reference ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.scale_reference TO anon, authenticated;
GRANT ALL ON public.scale_reference TO service_role;
CREATE POLICY "Everyone reads benchmark reference values"
  ON public.scale_reference FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins manage benchmark reference values"
  ON public.scale_reference FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));