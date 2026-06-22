-- Phase 42B — allow video owners to write a landmark run row for their own video.
CREATE POLICY "owner inserts landmark runs"
  ON public.video_landmark_runs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.videos v
      WHERE v.id = video_landmark_runs.video_id
        AND v.user_id = auth.uid()
    )
  );

GRANT SELECT, INSERT ON public.video_landmark_runs TO authenticated;
GRANT ALL ON public.video_landmark_runs TO service_role;