import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useProgramsRetired } from "@/hooks/useProgramsRetired";
import { HMLoadingFallback } from "@/components/loading/HMLoadingScreen";

/**
 * Wraps one of the five program pages. Switch OFF (default): the page opens
 * exactly as before. Switch ON: the address quietly goes to the dashboard —
 * no banner, no program mention.
 */
export function RetiredProgramRoute({ children }: { children: ReactNode }) {
  const { retired, ready } = useProgramsRetired();
  if (!ready) return <HMLoadingFallback />;
  if (retired) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}
