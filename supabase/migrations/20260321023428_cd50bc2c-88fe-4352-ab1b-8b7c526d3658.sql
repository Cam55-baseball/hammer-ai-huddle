
-- Add persistent video path columns to royal_timing_sessions
ALTER TABLE public.royal_timing_sessions
  ADD COLUMN IF NOT EXISTS video_1_path text,
  ADD COLUMN IF NOT EXISTS video_2_path text;

-- Create royal_timing_shares table
CREATE TABLE public.royal_timing_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.royal_timing_sessions(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  recipient_id uuid NOT NULL,
  message text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.royal_timing_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own shares"
  ON public.royal_timing_shares FOR SELECT TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

CREATE POLICY "Users can create shares to linked users"
  ON public.royal_timing_shares FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
    AND public.is_linked_coach(sender_id, recipient_id)
       OR public.is_linked_coach(recipient_id, sender_id)
  );

CREATE POLICY "Senders can delete their shares"
  ON public.royal_timing_shares FOR DELETE TO authenticated
  USING (auth.uid() = sender_id);

-- Create royal_timing_messages table
CREATE TABLE public.royal_timing_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.royal_timing_sessions(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  message text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.royal_timing_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view session messages"
  ON public.royal_timing_messages FOR SELECT TO authenticated
  USING (
    auth.uid() = sender_id
    OR EXISTS (
      SELECT 1 FROM public.royal_timing_sessions
      WHERE id = session_id AND user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.royal_timing_shares
      WHERE session_id = royal_timing_messages.session_id
        AND recipient_id = auth.uid()
    )
  );

CREATE POLICY "Participants can send session messages"
  ON public.royal_timing_messages FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
    AND (
      EXISTS (
        SELECT 1 FROM public.royal_timing_sessions
        WHERE id = session_id AND user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM public.royal_timing_shares
        WHERE session_id = royal_timing_messages.session_id
          AND recipient_id = auth.uid()
      )
    )
  );

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.royal_timing_messages;
