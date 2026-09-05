/**
 * Release gate for scored grading (report card, score dial, 20–80 grade).
 *
 * Owner/admin only until the measurement engine is real. Mirrors the
 * server-side gate in `supabase/functions/_shared/scoredGradingGate.ts` —
 * this is the UI half, never the enforcement.
 */
import { useOwnerAccess } from '@/hooks/useOwnerAccess';
import { useAdminAccess } from '@/hooks/useAdminAccess';

export const SCORED_GRADING_NOTICE =
  "Scored grading is coming once the measurement engine is live. Rather than " +
  "show you a number we can't stand behind, we're showing you the coaching.";

export function useScoredGradingAccess() {
  const { isOwner, loading: ownerLoading } = useOwnerAccess();
  const { isAdmin, loading: adminLoading } = useAdminAccess();
  return {
    allowed: isOwner || isAdmin,
    loading: ownerLoading || adminLoading,
  };
}
