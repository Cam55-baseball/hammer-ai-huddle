import type { ReactNode } from "react";
import { useOwnerAccess } from "@/hooks/useOwnerAccess";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { canSeeReportCard } from "@/lib/reportCard/visibility";

/** Renders children only for roles allowed to see the Report Card. Nothing otherwise. */
export function ReportCardAccessGate({ children }: { children: ReactNode }) {
  const { isOwner, loading: l1 } = useOwnerAccess();
  const { isAdmin, loading: l2 } = useAdminAccess();
  if (l1 || l2) return null;
  if (!canSeeReportCard({ isOwner, isAdmin })) return null;
  return <>{children}</>;
}
