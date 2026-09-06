/**
 * EvidenceSafeSession — Stage 1 acceptance evidence #3.
 *
 * DEV-ONLY. Not reachable in a production build and linked from nowhere.
 *
 * Renders the REAL Safe Session — the eight hardcoded rows returned by
 * `safeSessionRows()` in supabase/functions/_shared/wic/safePlan.ts — through
 * the REAL athlete components (`WkSafePlanNotice`, `WkPrescriptionCard`) so a
 * phone-width screenshot shows what the athlete actually sees at Rung 4 of the
 * ladder. Nothing is written; no plan is generated for any user.
 */
import { HammersTodayContext } from "@/components/hammer/HammersTodayProvider";
import { WkSafePlanNotice } from "@/components/hammer/WkSafePlanNotice";
import { WkPrescriptionCard } from "@/components/hammer/WkPrescriptionCard";
import type { WkRx } from "@/hooks/useWkDailyPrescriptions";
import {
  safeSessionRows,
  SAFE_PLAN_COPY,
} from "../../supabase/functions/_shared/wic/safePlan.ts";

const PLAN_DATE = "2026-01-01";

const rows: WkRx[] = safeSessionRows().map((r, i) => ({
  ...(r as unknown as WkRx),
  id: `safe-${i}`,
  plan_date: PLAN_DATE,
  phase: "in_season",
  tempo: null,
  load_pct: null,
  substituted_from_slug: null,
  substitution_reason: null,
  why_payload: {
    ...((r as { why_payload?: Record<string, unknown> }).why_payload ?? {}),
    safe_plan_copy: SAFE_PLAN_COPY,
    safe_plan_dropped: [],
  },
})) as WkRx[];

export default function EvidenceSafeSession() {
  if (!import.meta.env.DEV) return null;

  const snapshot = {
    data: rows,
    isLoading: false,
    isError: false,
    error: null,
    refetch: () => Promise.resolve(),
  } as unknown as React.ContextType<typeof HammersTodayContext>;

  return (
    <HammersTodayContext.Provider value={snapshot}>
      <main className="mx-auto w-full max-w-md space-y-3 p-3">
        <h1 className="text-base font-semibold text-foreground">Safe Session</h1>
        <WkSafePlanNotice />
        {rows.map((rx) => (
          <WkPrescriptionCard key={rx.id} rx={rx} />
        ))}
      </main>
    </HammersTodayContext.Provider>
  );
}
