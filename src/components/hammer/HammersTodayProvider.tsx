/**
 * HammersTodayProvider — Phase 2 Fix 1, 3, 4.
 *
 * Constitutional guarantee: exactly ONE `useWkDailyPrescriptions` instance per
 * Hammers Today render. Every card (Warm-up, Speed/Bat, Lifts, Conditioning,
 * Cross, Recovery, Arm Care, Nutrition, Mental, Mobility) reads from the same
 * snapshot via `useHammersToday()`. Cards may consume; cards may never
 * generate. Generation is owned solely by this provider.
 */
import { createContext, useContext, type ReactNode } from "react";
import { useWkDailyPrescriptions } from "@/hooks/useWkDailyPrescriptions";

type HammersTodaySnapshot = ReturnType<typeof useWkDailyPrescriptions>;

const HammersTodayContext = createContext<HammersTodaySnapshot | null>(null);

export function HammersTodayProvider({ children, planDate }: { children: ReactNode; planDate?: string }) {
  // Single canonical generation entrypoint for the entire Hammers Today subtree.
  const snapshot = useWkDailyPrescriptions(planDate);
  return <HammersTodayContext.Provider value={snapshot}>{children}</HammersTodayContext.Provider>;
}

/**
 * Read-only accessor for the canonical prescription snapshot. Cards MUST use
 * this — direct `useWkDailyPrescriptions()` calls from cards are forbidden by
 * Phase 2 doctrine because they would spawn additional generation lifecycles.
 */
export function useHammersToday(): HammersTodaySnapshot {
  const ctx = useContext(HammersTodayContext);
  if (!ctx) {
    throw new Error(
      "useHammersToday() must be used inside <HammersTodayProvider>. " +
        "This is Phase 2 canonical-pipeline enforcement — cards may not spawn their own generation lifecycles.",
    );
  }
  return ctx;
}
