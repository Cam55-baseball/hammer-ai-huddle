
-- Create live_ab_links table for cross-session linking
CREATE TABLE public.live_ab_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  link_code TEXT NOT NULL UNIQUE,
  creator_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  creator_session_id UUID REFERENCES public.performance_sessions(id),
  joiner_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  joiner_session_id UUID REFERENCES public.performance_sessions(id),
  status TEXT NOT NULL DEFAULT 'pending',
  sport TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '2 hours'),
  used_at TIMESTAMPTZ
);

ALTER TABLE public.live_ab_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own links" ON public.live_ab_links
  FOR SELECT TO authenticated
  USING (creator_user_id = auth.uid() OR joiner_user_id = auth.uid());

CREATE POLICY "Users create links" ON public.live_ab_links
  FOR INSERT TO authenticated
  WITH CHECK (creator_user_id = auth.uid());

CREATE POLICY "Users update own links" ON public.live_ab_links
  FOR UPDATE TO authenticated
  USING (creator_user_id = auth.uid() OR joiner_user_id = auth.uid());

-- Anyone authenticated can look up a link by code to join
CREATE POLICY "Anyone can lookup pending links" ON public.live_ab_links
  FOR SELECT TO authenticated
  USING (status = 'pending');

-- Add linked session columns to performance_sessions
ALTER TABLE public.performance_sessions 
  ADD COLUMN IF NOT EXISTS linked_session_id UUID REFERENCES public.performance_sessions(id),
  ADD COLUMN IF NOT EXISTS link_code TEXT;
