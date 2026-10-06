CREATE POLICY "No follows with hidden accounts" ON public.scout_follows AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'owner') OR (NOT private.is_hidden_account(player_id) AND NOT private.is_hidden_account(scout_id)));
CREATE POLICY "No follow updates with hidden accounts" ON public.scout_follows AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'owner') OR (NOT private.is_hidden_account(player_id) AND NOT private.is_hidden_account(scout_id)));
CREATE POLICY "No shares with hidden accounts" ON public.royal_timing_shares AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (NOT private.is_hidden_account(sender_id) AND NOT private.is_hidden_account(recipient_id));
CREATE POLICY "No messages on hidden accounts' sessions" ON public.royal_timing_messages AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (NOT private.is_hidden_account(sender_id) AND NOT EXISTS (
    SELECT 1 FROM public.royal_timing_sessions s WHERE s.id = session_id AND private.is_hidden_account(s.user_id)));