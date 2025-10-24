-- Create enum for sport types
CREATE TYPE public.sport_type AS ENUM ('baseball', 'softball');

-- Create enum for module types
CREATE TYPE public.module_type AS ENUM ('hitting', 'pitching', 'throwing');

-- Create enum for video status
CREATE TYPE public.video_status AS ENUM ('uploading', 'processing', 'completed', 'failed');

-- Create enum for training data types
CREATE TYPE public.training_data_type AS ENUM ('professional_example', 'common_mistake');

-- Create videos table for user-uploaded videos
CREATE TABLE public.videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sport public.sport_type NOT NULL,
  module public.module_type NOT NULL,
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  status public.video_status NOT NULL DEFAULT 'uploading',
  mocap_data JSONB,
  ai_analysis JSONB,
  efficiency_score INTEGER CHECK (efficiency_score >= 0 AND efficiency_score <= 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create training_data table for owner-uploaded reference videos
CREATE TABLE public.training_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sport public.sport_type NOT NULL,
  module public.module_type NOT NULL,
  data_type public.training_data_type NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  mocap_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create user_progress table to track module progress
CREATE TABLE public.user_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  module public.module_type NOT NULL,
  sport public.sport_type NOT NULL,
  videos_analyzed INTEGER NOT NULL DEFAULT 0,
  average_efficiency_score INTEGER,
  last_activity TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, module, sport)
);

-- Enable RLS on all tables
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policies for videos table
CREATE POLICY "Users can view their own videos"
  ON public.videos FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own videos"
  ON public.videos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own videos"
  ON public.videos FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own videos"
  ON public.videos FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Owners can view all videos"
  ON public.videos FOR SELECT
  USING (has_role(auth.uid(), 'owner'));

-- RLS Policies for training_data table
CREATE POLICY "Everyone can view training data"
  ON public.training_data FOR SELECT
  USING (true);

CREATE POLICY "Owners can insert training data"
  ON public.training_data FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'owner'));

CREATE POLICY "Owners can update training data"
  ON public.training_data FOR UPDATE
  USING (has_role(auth.uid(), 'owner'));

CREATE POLICY "Owners can delete training data"
  ON public.training_data FOR DELETE
  USING (has_role(auth.uid(), 'owner'));

-- RLS Policies for user_progress table
CREATE POLICY "Users can view their own progress"
  ON public.user_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own progress"
  ON public.user_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own progress"
  ON public.user_progress FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Owners can view all progress"
  ON public.user_progress FOR SELECT
  USING (has_role(auth.uid(), 'owner'));

-- Create updated_at trigger function (if not exists)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers
CREATE TRIGGER update_videos_updated_at
  BEFORE UPDATE ON public.videos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_training_data_updated_at
  BEFORE UPDATE ON public.training_data
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_videos_user_id ON public.videos(user_id);
CREATE INDEX idx_videos_module ON public.videos(module);
CREATE INDEX idx_videos_sport ON public.videos(sport);
CREATE INDEX idx_videos_status ON public.videos(status);
CREATE INDEX idx_training_data_module ON public.training_data(module);
CREATE INDEX idx_training_data_sport ON public.training_data(sport);
CREATE INDEX idx_training_data_tags ON public.training_data USING GIN(tags);
CREATE INDEX idx_user_progress_user_id ON public.user_progress(user_id);