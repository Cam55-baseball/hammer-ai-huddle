
-- 1. library_videos
CREATE TABLE public.library_videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  video_url text,
  video_type text NOT NULL DEFAULT 'upload',
  thumbnail_url text,
  tags text[] NOT NULL DEFAULT '{}',
  sport text[] NOT NULL DEFAULT '{}',
  category text,
  likes_count integer NOT NULL DEFAULT 0,
  views_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.library_videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can do everything with library_videos"
  ON public.library_videos FOR ALL
  TO authenticated
  USING (public.user_has_role(auth.uid(), 'owner'))
  WITH CHECK (public.user_has_role(auth.uid(), 'owner'));

CREATE POLICY "Authenticated users can view library_videos"
  ON public.library_videos FOR SELECT
  TO authenticated
  USING (true);

-- 2. library_video_likes
CREATE TABLE public.library_video_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  video_id uuid REFERENCES public.library_videos(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, video_id)
);

ALTER TABLE public.library_video_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own likes"
  ON public.library_video_likes FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 3. library_tags
CREATE TABLE public.library_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  category text,
  parent_category text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.library_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can manage tags"
  ON public.library_tags FOR ALL
  TO authenticated
  USING (public.user_has_role(auth.uid(), 'owner'))
  WITH CHECK (public.user_has_role(auth.uid(), 'owner'));

CREATE POLICY "Authenticated users can view tags"
  ON public.library_tags FOR SELECT
  TO authenticated
  USING (true);

-- 4. library_video_analytics
CREATE TABLE public.library_video_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id uuid REFERENCES public.library_videos(id) ON DELETE CASCADE NOT NULL,
  user_id uuid,
  action text NOT NULL,
  search_term text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.library_video_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own analytics"
  ON public.library_video_analytics FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owner can view all analytics"
  ON public.library_video_analytics FOR SELECT
  TO authenticated
  USING (public.user_has_role(auth.uid(), 'owner'));

-- Indexes
CREATE INDEX idx_library_videos_tags ON public.library_videos USING GIN (tags);
CREATE INDEX idx_library_videos_sport ON public.library_videos USING GIN (sport);
CREATE INDEX idx_library_videos_title_search ON public.library_videos USING GIN (to_tsvector('english', title || ' ' || COALESCE(description, '')));
CREATE INDEX idx_library_video_likes_video ON public.library_video_likes(video_id);
CREATE INDEX idx_library_video_likes_user ON public.library_video_likes(user_id);

-- Trigger for likes count
CREATE OR REPLACE FUNCTION public.update_library_video_likes_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.library_videos SET likes_count = likes_count + 1 WHERE id = NEW.video_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.library_videos SET likes_count = likes_count - 1 WHERE id = OLD.video_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_update_library_likes_count
AFTER INSERT OR DELETE ON public.library_video_likes
FOR EACH ROW EXECUTE FUNCTION public.update_library_video_likes_count();
