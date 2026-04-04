CREATE OR REPLACE FUNCTION public.attach_session_to_link(
  p_user_id UUID,
  p_link_code TEXT,
  p_session_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_link live_ab_links;
BEGIN
  -- 1. Lock the link row (prevents ALL races)
  SELECT * INTO v_link
  FROM live_ab_links
  WHERE link_code = p_link_code
  FOR UPDATE;

  IF v_link IS NULL THEN
    RETURN;
  END IF;

  -- 2. Reject invalid states early
  IF v_link.status NOT IN ('pending', 'claimed', 'linked') THEN
    RETURN;
  END IF;

  -- 3. Enforce GLOBAL session uniqueness
  IF EXISTS (
    SELECT 1
    FROM live_ab_links
    WHERE (creator_session_id = p_session_id OR joiner_session_id = p_session_id)
      AND id != v_link.id
  ) THEN
    RETURN;
  END IF;

  -- 4. Idempotent attach (COALESCE prevents overwrite)
  IF v_link.creator_user_id = p_user_id THEN
    UPDATE live_ab_links
    SET creator_session_id = COALESCE(creator_session_id, p_session_id)
    WHERE id = v_link.id;

  ELSIF v_link.joiner_user_id = p_user_id THEN
    UPDATE live_ab_links
    SET joiner_session_id = COALESCE(joiner_session_id, p_session_id)
    WHERE id = v_link.id;

  ELSE
    RETURN;
  END IF;

  -- 5. Reload locked row after update
  SELECT * INTO v_link
  FROM live_ab_links
  WHERE id = v_link.id;

  -- 6. Finalize linking if BOTH sessions exist
  IF v_link.creator_session_id IS NOT NULL
     AND v_link.joiner_session_id IS NOT NULL THEN

    UPDATE performance_sessions
    SET linked_session_id = v_link.joiner_session_id
    WHERE id = v_link.creator_session_id
      AND linked_session_id IS DISTINCT FROM v_link.joiner_session_id;

    UPDATE performance_sessions
    SET linked_session_id = v_link.creator_session_id
    WHERE id = v_link.joiner_session_id
      AND linked_session_id IS DISTINCT FROM v_link.creator_session_id;

    IF v_link.status != 'linked' THEN
      UPDATE live_ab_links
      SET status = 'linked',
          linked_at = now()
      WHERE id = v_link.id;
    END IF;

  END IF;

END;
$$;