import { type ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { usePurchaseAvailability } from "@/hooks/usePurchaseAvailability";

/** Never render athlete pricing or module previews for active coach/scout roles. */
export function AthletePurchaseRoute({ children }: { children: ReactNode }) {
  const { isStaffAccount, roleLoading } = usePurchaseAvailability();
  if (roleLoading) return null;
  if (isStaffAccount) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}