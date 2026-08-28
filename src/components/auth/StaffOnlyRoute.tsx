/**
 * Pre-release lockdown wrapper — owner/admin only.
 * Same pattern as the pitch-velocity lockdown: unfinished surfaces stay
 * unreachable for regular users at the route level, not just hidden in nav.
 */
import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useOwnerAccess } from "@/hooks/useOwnerAccess";
import { useAdminAccess } from "@/hooks/useAdminAccess";

export function StaffOnlyRoute({ children }: { children: ReactNode }) {
  const { isOwner, loading: ownerLoading } = useOwnerAccess();
  const { isAdmin, loading: adminLoading } = useAdminAccess();

  if (ownerLoading || adminLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isOwner && !isAdmin) return <Navigate to="/dashboard" replace />;

  return <>{children}</>;
}
