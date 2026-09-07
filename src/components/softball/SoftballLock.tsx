import { ReactNode } from "react";
import { useSportTheme } from "@/contexts/SportThemeContext";
import { useOwnerAccess } from "@/hooks/useOwnerAccess";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { Skeleton } from "@/components/ui/skeleton";
import SoftballComingSoon from "@/pages/SoftballComingSoon";
import {
  SOFTBALL_LOCKED_FEATURES,
  type SoftballLockedFeature,
} from "@/lib/softball/lockedFeatures";

/**
 * Pre-launch softball lockdown gate.
 *
 * Baseball users pass straight through. Owner/admin pass through on either
 * sport. Softball athletes get the coming-soon screen instead of a surface
 * that would give them baseball answers.
 */
export function SoftballLock({
  feature,
  children,
}: {
  feature: SoftballLockedFeature;
  children: ReactNode;
}) {
  const { isSoftball } = useSportTheme();
  const { isOwner, loading: ownerLoading } = useOwnerAccess();
  const { isAdmin, loading: adminLoading } = useAdminAccess();

  if (!isSoftball) return <>{children}</>;

  if (ownerLoading || adminLoading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (isOwner || isAdmin) return <>{children}</>;

  return (
    <SoftballComingSoon featureName={SOFTBALL_LOCKED_FEATURES[feature].label} />
  );
}

/** Hook form for hiding nav entries and in-page panels. */
export function useSoftballLocked(feature: SoftballLockedFeature): boolean {
  const { isSoftball } = useSportTheme();
  const { isOwner } = useOwnerAccess();
  const { isAdmin } = useAdminAccess();
  return isSoftball && !isOwner && !isAdmin && feature in SOFTBALL_LOCKED_FEATURES;
}
