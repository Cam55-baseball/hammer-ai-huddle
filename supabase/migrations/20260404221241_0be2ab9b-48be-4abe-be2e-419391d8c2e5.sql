
-- Fix 1: Add RLS policy allowing any authenticated user to join pending links
CREATE POLICY "Anyone can join pending links"
  ON public.live_ab_links
  FOR UPDATE TO authenticated
  USING (status = 'pending' AND joiner_user_id IS NULL)
  WITH CHECK (status = 'active');

-- Fix 2: Atomic join RPC — single statement, no race condition
CREATE OR REPLACE FUNCTION public.claim_ab_link(p_code TEXT, p_user_id UUID)
RETURNS SETOF live_ab_links
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  UPDATE live_ab_links
  SET joiner_user_id = p_user_id,
      status = 'active',
      used_at = now()
  WHERE link_code = p_code
    AND status = 'pending'
    AND joiner_user_id IS NULL
    AND creator_user_id != p_user_id
    AND created_at > now() - interval '2 hours'
  RETURNING *;
$$;

-- Fix 5: Cancel old pending links when generating a new one (unique active constraint)
CREATE OR REPLACE FUNCTION public.cancel_pending_links(p_user_id UUID)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  UPDATE live_ab_links
  SET status = 'expired'
  WHERE creator_user_id = p_user_id
    AND status = 'pending';
$$;

-- Fix 8: Bidirectional session ID update RPC
CREATE OR REPLACE FUNCTION public.update_link_session_id(p_link_code TEXT, p_user_id UUID, p_session_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_link live_ab_links;
  v_partner_session_id UUID;
BEGIN
  SELECT * INTO v_link FROM live_ab_links WHERE link_code = p_link_code LIMIT 1;
  IF v_link IS NULL THEN RETURN; END IF;

  IF v_link.creator_user_id = p_user_id THEN
    UPDATE live_ab_links SET creator_session_id = p_session_id WHERE id = v_link.id;
    -- Update creator's performance_sessions.linked_session_id to joiner's session
    IF v_link.joiner_session_id IS NOT NULL THEN
      UPDATE performance_sessions SET linked_session_id = v_link.joiner_session_id WHERE id = p_session_id AND user_id = p_user_id;
    END IF;
    -- Update joiner's performance_sessions.linked_session_id to creator's session
    IF v_link.joiner_session_id IS NOT NULL THEN
      UPDATE performance_sessions SET linked_session_id = p_session_id WHERE id = v_link.joiner_session_id AND user_id = v_link.joiner_user_id;
    END IF;
  ELSE
    UPDATE live_ab_links SET joiner_session_id = p_session_id WHERE id = v_link.id;
    -- Update joiner's performance_sessions.linked_session_id to creator's session
    IF v_link.creator_session_id IS NOT NULL THEN
      UPDATE performance_sessions SET linked_session_id = v_link.creator_session_id WHERE id = p_session_id AND user_id = p_user_id;
    END IF;
    -- Update creator's performance_sessions.linked_session_id to joiner's session
    IF v_link.creator_session_id IS NOT NULL THEN
      UPDATE performance_sessions SET linked_session_id = p_session_id WHERE id = v_link.creator_session_id AND user_id = v_link.creator_user_id;
    END IF;
  END IF;
END;
$$;
