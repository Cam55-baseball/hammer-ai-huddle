INSERT INTO storage.buckets (id, name, public) VALUES ('promo-videos', 'promo-videos', true);

CREATE POLICY "Anyone can read promo videos" ON storage.objects FOR SELECT USING (bucket_id = 'promo-videos');
CREATE POLICY "Service role can upload promo videos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'promo-videos');
CREATE POLICY "Service role can update promo videos" ON storage.objects FOR UPDATE USING (bucket_id = 'promo-videos');
CREATE POLICY "Service role can delete promo videos" ON storage.objects FOR DELETE USING (bucket_id = 'promo-videos');