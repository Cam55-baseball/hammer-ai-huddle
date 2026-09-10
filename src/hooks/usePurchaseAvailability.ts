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

export function usePurchaseAvailability(): PurchaseAvailability {
  const [availability, setAvailability] = useState<PurchaseAvailability>(() =>
    getPurchaseAvailability(),
  );

  useEffect(() => {
    setAvailability(getPurchaseAvailability());
    const onChange = () => setAvailability(getPurchaseAvailability());
    window.addEventListener("hammers:storefront-changed", onChange);
    return () => window.removeEventListener("hammers:storefront-changed", onChange);
  }, []);

  return availability;
}
