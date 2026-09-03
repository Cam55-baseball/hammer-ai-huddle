CREATE TABLE public.video_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  video_id uuid NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  timestamp_sec numeric NULL,
  kind text NOT NULL CHECK (kind IN ('text','voice')),
  body text NULL,
  audio_url text NULL,
  duration_sec numeric NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.video_notes TO authenticated;
GRANT ALL ON public.video_notes TO service_role;

ALTER TABLE public.video_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own video notes"
  ON public.video_notes FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own video notes"
  ON public.video_notes FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own video notes"
  ON public.video_notes FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own video notes"
  ON public.video_notes FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX idx_video_notes_video_timestamp ON public.video_notes (video_id, timestamp_sec);