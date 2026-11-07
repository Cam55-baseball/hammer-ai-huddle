// Owner Nov 6: the plan squares, merch, Coach/Organization plans and Add-ons live on one page
// reached from the Dashboard's "Find Your Training Plan" button.
export type PlanSport = "baseball" | "softball";
export type PlanTileModule = "pitcher" | "5tool" | "golden2way";

export const TRAINING_PLANS_PATH = "/training-plans";

/** Opens the page on the sport selected on the Dashboard. */
export const trainingPlansUrl = (sport: PlanSport) => `${TRAINING_PLANS_PATH}?sport=${sport}`;

export interface Destination { path: string; state?: Record<string, unknown> }

/**
 * Where a plan square goes when tapped — the same rules the Dashboard used.
 * Locked squares send the player to Pricing, remembering to come back to the plans page.
 */
export function planTileDestination(input: {
  module: PlanTileModule;
  sport: PlanSport;
  isOwnerOrAdmin: boolean;
  canShowPurchaseUI: boolean;
  isTierUnlocked: (tier: string) => boolean;
  heldPlans: readonly string[];
  hasAccessForSport: (module: string, sport: string, isOwnerOrAdmin?: boolean) => boolean;
}): Destination | null {
  const { module, sport, isOwnerOrAdmin, canShowPurchaseUI, isTierUnlocked, heldPlans, hasAccessForSport } = input;
  // Purchase hidden: a locked tile is inert. No routing to pricing.
  if (!canShowPurchaseUI && !isOwnerOrAdmin && !isTierUnlocked(module) && !heldPlans.includes("golden2way")) return null;
  const pricing = (tier: PlanTileModule): Destination => ({ path: "/pricing", state: pricingState(sport, tier) });
  if (module === "pitcher") {
    return isOwnerOrAdmin || hasAccessForSport("pitching", sport, isOwnerOrAdmin) ? { path: "/complete-pitcher" } : pricing("pitcher");
  }
  if (module === "5tool") {
    return isOwnerOrAdmin || hasAccessForSport("hitting", sport, isOwnerOrAdmin) ? { path: "/5tool-player" } : pricing("5tool");
  }
  const both = isOwnerOrAdmin || (hasAccessForSport("hitting", sport, isOwnerOrAdmin) && hasAccessForSport("pitching", sport, isOwnerOrAdmin));
  return both ? { path: "/golden-2way" } : pricing("golden2way");
}

/** Pricing state from a plan square: same sport/tier as before plus where Back should return. */
export const pricingState = (sport: PlanSport, tier: PlanTileModule) => ({ sport, tier, from: TRAINING_PLANS_PATH });

/** Pricing's Back button: the plans page when the player came from it, otherwise the Dashboard. */
export function pricingBackTarget(state: unknown): { path: string; toPlans: boolean } {
  const from = (state as { from?: unknown } | null)?.from;
  return from === TRAINING_PLANS_PATH ? { path: TRAINING_PLANS_PATH, toPlans: true } : { path: "/dashboard", toPlans: false };
}
