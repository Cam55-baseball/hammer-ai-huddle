-- Create video_annotations table for scout/coach annotations
CREATE TABLE public.video_annotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  scout_id UUID NOT NULL,
  player_id UUID NOT NULL,
  annotation_data TEXT NOT NULL,
  original_frame_data TEXT NOT NULL,
  notes TEXT,
  frame_timestamp DECIMAL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.video_annotations ENABLE ROW LEVEL SECURITY;

-- Scouts can insert annotations on videos of players they follow (accepted)
CREATE POLICY "Scouts can insert annotations on followed player videos"
ON public.video_annotations
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.scout_follows
    WHERE scout_id = auth.uid()
      AND player_id = video_annotations.player_id
      AND status = 'accepted'
  )
  AND scout_id = auth.uid()
);

-- Scouts can view/update/delete their own annotations
CREATE POLICY "Scouts can view their own annotations"
ON public.video_annotations
FOR SELECT
TO authenticated
USING (scout_id = auth.uid());

CREATE POLICY "Scouts can update their own annotations"
ON public.video_annotations
FOR UPDATE
TO authenticated
USING (scout_id = auth.uid());

CREATE POLICY "Scouts can delete their own annotations"
ON public.video_annotations
FOR DELETE
TO authenticated
USING (scout_id = auth.uid());

-- Players can view annotations on their own videos
CREATE POLICY "Players can view annotations on their videos"
ON public.video_annotations
FOR SELECT
TO authenticated
USING (player_id = auth.uid());

-- Owners can view all annotations
CREATE POLICY "Owners can view all annotations"
ON public.video_annotations
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'owner'));

-- Add index for performance
CREATE INDEX idx_video_annotations_video_id ON public.video_annotations(video_id);
CREATE INDEX idx_video_annotations_scout_id ON public.video_annotations(scout_id);
CREATE INDEX idx_video_annotations_player_id ON public.video_annotations(player_id);