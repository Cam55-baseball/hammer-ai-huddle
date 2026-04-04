
-- ============================================================
-- GOLD STANDARD PATCHES — Session Linking State Machine
-- ============================================================

-- 1. Schema changes: add claimed_at, linked_at columns
ALTER TABLE public.live_ab_links ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ NULL;
ALTER TABLE public.live_ab_links ADD COLUMN IF NOT EXISTS linked_at TIMESTAMPTZ NULL;

-- Migrate existing 'active' status to 'linked' before adding constraint
UPDATE public.live_ab_links SET status = 'linked' WHERE status = 'active';

-- Drop used_at column (replaced by claimed_at / linked_at)
ALTER TABLE public.live_ab_links DROP COLUMN IF EXISTS used_at;

-- Add status check constraint
ALTER TABLE public.live_ab_links DROP CONSTRAINT IF EXISTS live_ab_links_status_check;
ALTER TABLE public.live_ab_links ADD CONSTRAINT live_ab_links_status_check
  CHECK (status IN ('pending', 'claimed', 'linked', 'expired'));

-- ============================================================
-- PATCH 2: Duplicate session attach prevention indexes
-- ============================================================
CREATE UNIQUE INDEX IF NOT EXISTS one_creator_session_per_link
  ON public.live_ab_links (id) WHERE creator_session_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS one_joiner_session_per_link
  ON public.live_ab_links (id) WHERE joiner_session_id IS NOT NULL;

-- ============================================================
-- PATCH 1: attach_session_to_link (THE CORE FUNCTION)
-- ============================================================
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
  -- Lock the row (prevents all race conditions)
  SELECT * INTO v_link
  FROM live_ab_links
  WHERE link_code = p_link_code
  FOR UPDATE;

  IF v_link IS NULL THEN RETURN; END IF;

  -- Reject non-participants
  IF p_user_id NOT IN (v_link.creator_user_id, v_link.joiner_user_id) THEN
    RETURN;
  END IF;

  -- 1. ASSIGN SESSION (IDEMPOTENT via COALESCE)
  IF v_link.creator_user_id = p_user_id THEN
    UPDATE live_ab_links
    SET creator_session_id = COALESCE(creator_session_id, p_session_id)
    WHERE id = v_link.id;
  ELSE
    UPDATE live_ab_links
    SET joiner_session_id = COALESCE(joiner_session_id, p_session_id)
    WHERE id = v_link.id;
  END IF;

  -- Reload locked row after assignment
  SELECT * INTO v_link FROM live_ab_links WHERE id = v_link.id;

  -- 2. SELF-HEAL: enforce bidirectional link when both sessions present
  IF v_link.creator_session_id IS NOT NULL
     AND v_link.joiner_session_id IS NOT NULL THEN

    UPDATE performance_sessions
    SET linked_session_id = v_link.joiner_session_id
    WHERE id = v_link.creator_session_id
      AND (linked_session_id IS DISTINCT FROM v_link.joiner_session_id);

    UPDATE performance_sessions
    SET linked_session_id = v_link.creator_session_id
    WHERE id = v_link.joiner_session_id
      AND (linked_session_id IS DISTINCT FROM v_link.creator_session_id);

    -- Finalize state if not already linked
    IF v_link.status != 'linked' THEN
      UPDATE live_ab_links
      SET status = 'linked',
          linked_at = now()
      WHERE id = v_link.id;
    END IF;

    RETURN;
  END IF;

  -- 3. VALID STATE GUARD
  IF v_link.status NOT IN ('pending', 'claimed') THEN
    RETURN;
  END IF;
END;
$$;

-- ============================================================
-- PATCH 3: Replace create_ab_link and claim_ab_link
-- ============================================================

-- create_ab_link: expires existing links, inserts new one
CREATE OR REPLACE FUNCTION public.create_ab_link(
  p_user_id UUID,
  p_sport TEXT,
  p_link_code TEXT
)
RETURNS SETOF live_ab_links
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Expire all existing pending/claimed links for this user
  UPDATE live_ab_links
  SET status = 'expired'
  WHERE creator_user_id = p_user_id
    AND status IN ('pending', 'claimed');

  -- Also expire any globally stale links
  UPDATE live_ab_links
  SET status = 'expired'
  WHERE status IN ('pending', 'claimed')
    AND expires_at < now();

  -- Insert new pending link
  RETURN QUERY
  INSERT INTO live_ab_links (
    link_code, creator_user_id, sport, status, expires_at
  ) VALUES (
    p_link_code, p_user_id, p_sport, 'pending', now() + interval '2 hours'
  )
  RETURNING *;
END;
$$;

-- claim_ab_link: atomic claim with expiration guard
CREATE OR REPLACE FUNCTION public.claim_ab_link(
  p_code TEXT,
  p_user_id UUID
)
RETURNS SETOF live_ab_links
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Pre-clean expired links
  UPDATE live_ab_links
  SET status = 'expired'
  WHERE status IN ('pending', 'claimed')
    AND expires_at < now();

  -- Atomic claim
  RETURN QUERY
  UPDATE live_ab_links
  SET joiner_user_id = p_user_id,
      status = 'claimed',
      claimed_at = now()
  WHERE link_code = p_code
    AND status = 'pending'
    AND joiner_user_id IS NULL
    AND creator_user_id != p_user_id
    AND expires_at > now()
  RETURNING *;
END;
$$;

-- ============================================================
-- PATCH 4: Drop superseded functions
-- ============================================================
DROP FUNCTION IF EXISTS public.cancel_pending_links(UUID);
DROP FUNCTION IF EXISTS public.update_link_session_id(TEXT, UUID, UUID);

-- ============================================================
-- Cleanup function for scheduled use
-- ============================================================
CREATE OR REPLACE FUNCTION public.expire_stale_links()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  UPDATE live_ab_links
  SET status = 'expired'
  WHERE status IN ('pending', 'claimed')
    AND expires_at < now();
$$;
