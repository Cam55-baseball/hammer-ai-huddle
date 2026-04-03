
-- Create drills catalog table
CREATE TABLE public.drills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  module TEXT NOT NULL,
  skill_target TEXT,
  default_constraints JSONB DEFAULT '{}',
  video_url TEXT,
  difficulty_levels TEXT[] DEFAULT ARRAY['beginner','intermediate','advanced'],
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.drills ENABLE ROW LEVEL SECURITY;

-- Anyone can read drills
CREATE POLICY "Anyone can read drills" ON public.drills FOR SELECT USING (true);

-- Enable pg_cron and pg_net extensions for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
