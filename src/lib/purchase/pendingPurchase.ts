/**
 * A purchase the user started but the app hasn't seen confirmed yet.
 * Written just before handing off to Stripe; cleared once the webhook-written
 * entitlement is visible. Holds no authority — access is always read from the
 * server.
 */
import { hasFeatureAccess } from "@/utils/tierAccess";

const KEY = "hammers:pendingPurchase";

export interface PendingPurchase {
  tier: string;
  sport: string;
  sessionId: string | null;
  startedAt: number;
}

export function setPendingPurchase(p: PendingPurchase) {
  try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* ignore */ }
  window.dispatchEvent(new Event("hammers:pending-purchase"));
}

export function getPendingPurchase(): PendingPurchase | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as PendingPurchase;
    // A checkout session lives 24h; anything older is abandoned.
    if (!p?.startedAt || Date.now() - p.startedAt > 24 * 3600_000) {
      localStorage.removeItem(KEY);
      return null;
    }
    return p;
  } catch {
    return null;
  }
}

export function clearPendingPurchase() {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}

/** True when the server-side module list already covers the purchased tier. */
export function tierIsUnlocked(modules: string[], tier: string, sport: string): boolean {
  const mine = modules.filter((m) => m.startsWith(`${sport}_`));
  if (mine.includes(`${sport}_${tier}`)) return true;
  switch (tier) {
    case "pitcher": return hasFeatureAccess(mine, "pitching");
    case "5tool": return hasFeatureAccess(mine, "hitting") && hasFeatureAccess(mine, "throwing");
    case "golden2way":
      return mine.some((m) => m.includes("golden2way")) ||
        (hasFeatureAccess(mine, "hitting") && hasFeatureAccess(mine, "throwing") && hasFeatureAccess(mine, "pitching"));
    default: return mine.length > 0;
  }
}
