-- Create table to track which videos scouts have reviewed
CREATE TABLE public.scout_video_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  scout_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reviewed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(scout_id, video_id)
);

-- Enable RLS
ALTER TABLE public.scout_video_reviews ENABLE ROW LEVEL SECURITY;

-- Scouts can view their own reviews
CREATE POLICY "Scouts can view own reviews"
ON public.scout_video_reviews
FOR SELECT
USING (auth.uid() = scout_id);

-- Scouts can insert their own reviews
CREATE POLICY "Scouts can insert own reviews"
ON public.scout_video_reviews
FOR INSERT
WITH CHECK (auth.uid() = scout_id);

-- Scouts can delete their own reviews
CREATE POLICY "Scouts can delete own reviews"
ON public.scout_video_reviews
FOR DELETE
USING (auth.uid() = scout_id);

-- Owners can view all reviews
CREATE POLICY "Owners can view all reviews"
ON public.scout_video_reviews
FOR SELECT
USING (has_role(auth.uid(), 'owner'::app_role));

-- Create index for faster lookups
CREATE INDEX idx_scout_video_reviews_scout_id ON public.scout_video_reviews(scout_id);
CREATE INDEX idx_scout_video_reviews_video_id ON public.scout_video_reviews(video_id);
CREATE INDEX idx_scout_video_reviews_player_id ON public.scout_video_reviews(player_id);