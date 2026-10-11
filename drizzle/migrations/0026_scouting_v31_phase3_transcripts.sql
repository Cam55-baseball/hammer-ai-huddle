CREATE TABLE public.academic_transcripts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id uuid NOT NULL,
  file_path text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','verified','rejected')),
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  reviewed_by uuid,
  reviewed_at timestamptz
);
GRANT SELECT, INSERT, UPDATE ON public.academic_transcripts TO authenticated;
GRANT ALL ON public.academic_transcripts TO service_role;
ALTER TABLE public.academic_transcripts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "athlete reads own transcripts" ON public.academic_transcripts FOR SELECT TO authenticated
  USING (athlete_id = auth.uid() OR public.has_role(auth.uid(),'owner') OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "athlete uploads own pending transcript" ON public.academic_transcripts FOR INSERT TO authenticated
  WITH CHECK (athlete_id = auth.uid() AND status = 'pending' AND reviewed_by IS NULL AND file_path LIKE auth.uid()::text || '/%');
CREATE POLICY "owner/admin review transcripts" ON public.academic_transcripts FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'owner') OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'owner') OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "transcripts own upload" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'transcripts' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "transcripts own or staff read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'transcripts' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(),'owner') OR public.has_role(auth.uid(),'admin')));