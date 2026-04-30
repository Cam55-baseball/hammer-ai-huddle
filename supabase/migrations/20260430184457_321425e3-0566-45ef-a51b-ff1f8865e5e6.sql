-- Server-side unlink RPC
CREATE OR REPLACE FUNCTION public.expire_ab_link(p_user_id uuid, p_link_code text)
RETURNS SETOF public.live_ab_links
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  UPDATE public.live_ab_links
  SET status = 'expired'
  WHERE link_code = p_link_code
    AND status IN ('pending', 'claimed')
    AND (creator_user_id = p_user_id OR joiner_user_id = p_user_id)
  RETURNING *;
END;
$$;

GRANT EXECUTE ON FUNCTION public.expire_ab_link(uuid, text) TO authenticated;

-- Ensure both sides can SELECT the link row (needed for realtime status hook)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'live_ab_links'
      AND policyname = 'Participants can read their link'
  ) THEN
    CREATE POLICY "Participants can read their link"
    ON public.live_ab_links
    FOR SELECT
    TO authenticated
    USING (auth.uid() = creator_user_id OR auth.uid() = joiner_user_id);
  END IF;
END $$;

-- Add live_ab_links to realtime publication if not present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'live_ab_links'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.live_ab_links';
  END IF;
END $$;

ALTER TABLE public.live_ab_links REPLICA IDENTITY FULL;