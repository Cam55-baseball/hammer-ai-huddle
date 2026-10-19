import { useOwnerAccess } from "@/hooks/useOwnerAccess";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { GAME_IQ_AVAILABLE_TO_ATHLETES, gameIqVisible } from "@/lib/hammer/athleteFeatureAvailability";

/** Who may see Game IQ. Owner/admin always; everyone else only after release. */
export function useGameIqAccess() {
  const { isOwner, loading: l1 } = useOwnerAccess();
  const { isAdmin, loading: l2 } = useAdminAccess();
  return {
    allowed: gameIqVisible({ isOwner, isAdmin }),
    internal: !GAME_IQ_AVAILABLE_TO_ATHLETES,
    loading: l1 || l2,
  };
}
