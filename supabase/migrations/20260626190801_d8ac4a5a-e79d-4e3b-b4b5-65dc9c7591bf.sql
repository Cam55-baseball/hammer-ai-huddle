
ALTER TABLE public.video_landmark_runs ALTER COLUMN landmarks_storage_path DROP NOT NULL;

GRANT INSERT ON public.video_event_runs TO authenticated;
GRANT INSERT ON public.video_metric_runs TO authenticated;
GRANT INSERT ON public.video_analysis_runs TO authenticated;

CREATE POLICY "owner inserts event runs"
  ON public.video_event_runs FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.videos v WHERE v.id = video_event_runs.video_id AND v.user_id = auth.uid()));

CREATE POLICY "owner inserts metric runs"
  ON public.video_metric_runs FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.videos v WHERE v.id = video_metric_runs.video_id AND v.user_id = auth.uid()));

CREATE POLICY "owner inserts analysis runs"
  ON public.video_analysis_runs FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.videos v WHERE v.id = video_analysis_runs.video_id AND v.user_id = auth.uid()));
