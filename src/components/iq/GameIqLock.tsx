import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { useGameIqAccess } from "@/hooks/useGameIqAccess";
import { InternalLabel } from "@/components/InternalLabel";

/**
 * Game IQ (situations, game reports, heat maps, matchup planner) is
 * internal-only: owner and admin see it with an internal label; everyone
 * else is sent to the dashboard — no empty page, no "coming soon".
 */
export function GameIqLock({ children }: { children: ReactNode }) {
  const { allowed, internal, loading } = useGameIqAccess();
  if (loading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }
  if (!allowed) return <Navigate to="/dashboard" replace />;
  return (
    <>
      {internal && <div className="fixed top-2 right-2 z-50"><InternalLabel /></div>}
      {children}
    </>
  );
}
