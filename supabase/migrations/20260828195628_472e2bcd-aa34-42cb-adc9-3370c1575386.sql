ALTER TABLE public.video_metric_runs
  ADD COLUMN IF NOT EXISTS pitch_type text;

CREATE POLICY "owner updates own metric runs"
ON public.video_metric_runs FOR UPDATE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.videos v
  WHERE v.id = video_metric_runs.video_id
    AND v.user_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.videos v
  WHERE v.id = video_metric_runs.video_id
    AND v.user_id = auth.uid()
));