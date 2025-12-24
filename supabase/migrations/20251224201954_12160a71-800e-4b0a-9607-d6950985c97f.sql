-- Create custom-logos storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('custom-logos', 'custom-logos', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policy: Users can upload their own logos
CREATE POLICY "Users can upload their own logos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'custom-logos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- RLS policy: Everyone can view logos (they're public)
CREATE POLICY "Anyone can view custom logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'custom-logos');

-- RLS policy: Users can update their own logos
CREATE POLICY "Users can update their own logos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'custom-logos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- RLS policy: Users can delete their own logos
CREATE POLICY "Users can delete their own logos"
ON storage.objects FOR DELETE
USING (bucket_id = 'custom-logos' AND auth.uid()::text = (storage.foldername(name))[1]);