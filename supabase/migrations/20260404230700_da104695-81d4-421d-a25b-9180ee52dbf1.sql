-- Drop broken indexes (were on PK column, providing no real protection)
DROP INDEX IF EXISTS public.one_creator_session_per_link;
DROP INDEX IF EXISTS public.one_joiner_session_per_link;

-- Each session can only be attached as creator to ONE link globally
CREATE UNIQUE INDEX uniq_creator_session_per_link
  ON public.live_ab_links (creator_session_id)
  WHERE creator_session_id IS NOT NULL;

-- Each session can only be attached as joiner to ONE link globally
CREATE UNIQUE INDEX uniq_joiner_session_per_link
  ON public.live_ab_links (joiner_session_id)
  WHERE joiner_session_id IS NOT NULL;