
CREATE TABLE public.video_frame_extractions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_analysis_run_id uuid NOT NULL REFERENCES public.video_analysis_runs(id) ON DELETE CASCADE,
  video_id uuid NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  frame_index integer NOT NULL,
  timestamp_seconds numeric(12,6) NOT NULL,
  sha256_hex text NOT NULL,
  width integer NOT NULL,
  height integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (video_analysis_run_id, frame_index)
);

GRANT SELECT ON public.video_frame_extractions TO authenticated;
GRANT ALL ON public.video_frame_extractions TO service_role;

ALTER TABLE public.video_frame_extractions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner reads frame extractions"
  ON public.video_frame_extractions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.videos v
      WHERE v.id = video_frame_extractions.video_id
        AND v.user_id = auth.uid()
    )
  );

CREATE INDEX idx_video_frame_extractions_run
  ON public.video_frame_extractions (video_analysis_run_id, frame_index);
CREATE INDEX idx_video_frame_extractions_video
  ON public.video_frame_extractions (video_id);
