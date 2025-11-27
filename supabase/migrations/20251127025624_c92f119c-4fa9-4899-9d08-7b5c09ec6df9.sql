-- Create video_pose_analysis table to store skeleton tracking data
CREATE TABLE IF NOT EXISTS public.video_pose_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  violation_timestamps JSONB DEFAULT '[]'::jsonb,
  landmark_data JSONB DEFAULT '{}'::jsonb,
  processed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(video_id)
);

-- Enable RLS
ALTER TABLE public.video_pose_analysis ENABLE ROW LEVEL SECURITY;

-- Users can view pose analysis for their own videos
CREATE POLICY "Users can view pose analysis for own videos"
  ON public.video_pose_analysis
  FOR SELECT
  USING (
    video_id IN (
      SELECT id FROM public.videos WHERE user_id = auth.uid()
    )
  );

-- Users can insert pose analysis for their own videos
CREATE POLICY "Users can insert pose analysis for own videos"
  ON public.video_pose_analysis
  FOR INSERT
  WITH CHECK (
    video_id IN (
      SELECT id FROM public.videos WHERE user_id = auth.uid()
    )
  );

-- Users can update pose analysis for their own videos
CREATE POLICY "Users can update pose analysis for own videos"
  ON public.video_pose_analysis
  FOR UPDATE
  USING (
    video_id IN (
      SELECT id FROM public.videos WHERE user_id = auth.uid()
    )
  );

-- Scouts can view pose analysis for shared player videos
CREATE POLICY "Scouts can view pose analysis for shared videos"
  ON public.video_pose_analysis
  FOR SELECT
  USING (
    video_id IN (
      SELECT id FROM public.videos 
      WHERE shared_with_scouts = true 
      AND user_id IN (
        SELECT player_id FROM public.scout_follows 
        WHERE scout_id = auth.uid() AND status = 'accepted'
      )
    )
  );

-- Owners can view all pose analysis
CREATE POLICY "Owners can view all pose analysis"
  ON public.video_pose_analysis
  FOR SELECT
  USING (has_role(auth.uid(), 'owner'::app_role));

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_video_pose_analysis_video_id 
  ON public.video_pose_analysis(video_id);