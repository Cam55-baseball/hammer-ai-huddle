
-- Expire duplicate pending/claimed links, keeping only the newest per creator
UPDATE public.live_ab_links t
SET status = 'expired'
WHERE t.status IN ('pending', 'claimed')
  AND t.id != (
    SELECT id FROM public.live_ab_links t2
    WHERE t2.creator_user_id = t.creator_user_id
      AND t2.status IN ('pending', 'claimed')
    ORDER BY t2.created_at DESC
    LIMIT 1
  );

-- Now create the partial unique index
CREATE UNIQUE INDEX IF NOT EXISTS idx_live_ab_links_one_active_per_creator 
  ON public.live_ab_links (creator_user_id) 
  WHERE status IN ('pending', 'claimed');
