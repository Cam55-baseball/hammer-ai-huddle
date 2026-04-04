
-- Fix 1: Drop stale RLS policy referencing invalid 'active' status
DROP POLICY IF EXISTS "Anyone can join pending links" ON live_ab_links;

-- Fix 2: Expire orphaned pending rows that are past their expiration
UPDATE live_ab_links
SET status = 'expired'
WHERE status = 'pending'
  AND expires_at < now();
