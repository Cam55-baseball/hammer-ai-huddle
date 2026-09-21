/**
 * Step 24 item 2 — the drawer's copy of today's notices, read from the single
 * canonical snapshot. Every notice appears here, whatever card it concerns.
 */
import { useHammersToday } from "@/components/hammer/HammersTodayProvider";
import { DayNoticesCard } from "@/components/hammer/DayNoticesCard";
import { isDayStatementNotAReduction } from "@/components/hammer/WkPrescriptionCard";

export function DayNoticesDrawerItem() {
  const { reductions, planDate } = useHammersToday();
  const notices = (reductions ?? []).filter((r) => !isDayStatementNotAReduction(r?.detail));
  if (notices.length === 0) return null;
  return <DayNoticesCard notices={notices} planDate={planDate ?? new Date().toISOString().slice(0, 10)} />;
}
