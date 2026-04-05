
-- 1. promo_scenes table
CREATE TABLE public.promo_scenes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  feature_area TEXT NOT NULL,
  duration_variant TEXT NOT NULL DEFAULT '7s',
  description TEXT,
  scene_key TEXT NOT NULL,
  thumbnail_url TEXT,
  sim_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'active',
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. promo_projects table
CREATE TABLE public.promo_projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  target_audience TEXT NOT NULL,
  video_goal TEXT NOT NULL,
  target_duration INTEGER NOT NULL DEFAULT 30,
  scene_sequence JSONB NOT NULL DEFAULT '[]'::jsonb,
  format TEXT NOT NULL DEFAULT 'tiktok',
  status TEXT NOT NULL DEFAULT 'draft',
  output_url TEXT,
  render_metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. promo_render_queue table
CREATE TABLE public.promo_render_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.promo_projects(id) ON DELETE CASCADE,
  format TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  output_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.promo_scenes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_render_queue ENABLE ROW LEVEL SECURITY;

-- Owner-only policies for promo_scenes
CREATE POLICY "Owner can manage promo scenes" ON public.promo_scenes
  FOR ALL TO authenticated
  USING (public.user_has_role(auth.uid(), 'owner'))
  WITH CHECK (public.user_has_role(auth.uid(), 'owner'));

-- Owner-only policies for promo_projects
CREATE POLICY "Owner can manage promo projects" ON public.promo_projects
  FOR ALL TO authenticated
  USING (public.user_has_role(auth.uid(), 'owner'))
  WITH CHECK (public.user_has_role(auth.uid(), 'owner'));

-- Owner-only policies for promo_render_queue
CREATE POLICY "Owner can manage render queue" ON public.promo_render_queue
  FOR ALL TO authenticated
  USING (public.user_has_role(auth.uid(), 'owner'))
  WITH CHECK (public.user_has_role(auth.uid(), 'owner'));
