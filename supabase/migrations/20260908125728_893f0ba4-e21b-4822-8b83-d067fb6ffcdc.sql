ALTER TABLE public.library_video_analytics ADD COLUMN IF NOT EXISTS fault_scope text;
CREATE INDEX IF NOT EXISTS library_video_analytics_user_fault_idx
  ON public.library_video_analytics (user_id, fault_scope, video_id)
  WHERE fault_scope IS NOT NULL;