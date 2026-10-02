/**
 * React access to the single purchase gate. See src/lib/purchase/purchaseGate.ts.
 *
 * The native layer sets its flags before the app boots, so this is a plain
 * synchronous read. It re-reads on mount so a late native handshake still lands.
 */
import { useEffect, useState } from "react";
import {
  getPurchaseAvailability,
  type PurchaseAvailability,
} from "@/lib/purchase/purchaseGate";
import { useScoutAccess } from "@/hooks/useScoutAccess";
import { useAuth } from "@/hooks/useAuth";

export function usePurchaseAvailability(): PurchaseAvailability & { isStaffAccount: boolean; roleLoading: boolean } {
  const { user, loading: authLoading } = useAuth();
  const { isCoach, isScout, loading: roleLoading, roleCheckFailed } = useScoutAccess();
  const [availability, setAvailability] = useState<PurchaseAvailability>(() =>
    getPurchaseAvailability(),
  );

  useEffect(() => {
    setAvailability(getPurchaseAvailability());
    const onChange = () => setAvailability(getPurchaseAvailability());
    window.addEventListener("hammers:storefront-changed", onChange);
    return () => window.removeEventListener("hammers:storefront-changed", onChange);
  }, []);

  const isStaffAccount = isCoach || isScout;
  // Role readiness is for unsolicited advertising only; purchases remain available
  // through deliberate navigation under the platform storefront rules.
  const unresolved = authLoading || (!!user && (roleLoading || roleCheckFailed));
  return {
    ...availability,
    canShowPurchaseUI: availability.canShowPurchaseUI,
    isStaffAccount,
    roleLoading: unresolved,
    reason: availability.reason,
  };
}
