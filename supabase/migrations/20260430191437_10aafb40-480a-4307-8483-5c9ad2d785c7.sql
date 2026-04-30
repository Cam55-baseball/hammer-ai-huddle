CREATE OR REPLACE FUNCTION public.extend_ab_link(p_user_id uuid, p_link_code text)
RETURNS SETOF public.live_ab_links
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  UPDATE public.live_ab_links
  SET expires_at = now() + interval '2 hours'
  WHERE link_code = p_link_code
    AND status IN ('pending', 'claimed')
    AND (creator_user_id = p_user_id OR joiner_user_id = p_user_id)
  RETURNING *;
END;
$$;

GRANT EXECUTE ON FUNCTION public.extend_ab_link(uuid, text) TO authenticated;