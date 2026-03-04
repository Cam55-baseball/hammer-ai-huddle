
CREATE TABLE public.session_videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  session_id uuid REFERENCES public.performance_sessions(id) ON DELETE CASCADE NOT NULL,
  storage_path text NOT NULL,
  filename text,
  duration_ms integer,
  tagged_rep_indexes integer[] DEFAULT '{}',
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.session_videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own session videos"
  ON public.session_videos FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Coaches can view athlete videos"
  ON public.session_videos FOR SELECT TO authenticated
  USING (
    public.is_linked_coach(auth.uid(), user_id)
    OR public.is_org_coach_or_owner(auth.uid(), (
      SELECT om.organization_id FROM public.organization_members om WHERE om.user_id = session_videos.user_id LIMIT 1
    ))
  );
