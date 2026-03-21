CREATE TABLE public.royal_timing_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  subject_reason text,
  findings text,
  ai_analysis jsonb,
  timer_data jsonb,
  video_urls text[],
  sport text DEFAULT 'baseball',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.royal_timing_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own timing sessions"
  ON public.royal_timing_sessions FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);