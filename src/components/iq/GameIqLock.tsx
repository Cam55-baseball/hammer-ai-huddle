import { ReactNode } from "react";
import { useOwnerAccess } from "@/hooks/useOwnerAccess";
import { Skeleton } from "@/components/ui/skeleton";
import GameIqComingSoon from "@/pages/GameIqComingSoon";

/**
 * Game IQ 101 is locked for all athletes on every plan until launch.
 * Owners bypass the lock so authoring and testing continue to work.
 */
export function GameIqLock({ children }: { children: ReactNode }) {
  const { isOwner, loading } = useOwnerAccess();

  if (loading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!isOwner) return <GameIqComingSoon />;

  return <>{children}</>;
}
