CREATE POLICY "Users can delete own messages"
  ON public.royal_timing_messages FOR DELETE TO authenticated
  USING (auth.uid() = sender_id);