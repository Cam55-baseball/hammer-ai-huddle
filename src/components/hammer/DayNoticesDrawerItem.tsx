/**
 * Step 24 item 2 — the drawer's copy of today's notices, read from the single
 * canonical snapshot. Every notice appears here, whatever card it concerns.
 */
import { useHammersToday } from "@/components/hammer/HammersTodayProvider";
import { DayNoticesCard } from "@/components/hammer/DayNoticesCard";
import { isDayStatementNotAReduction } from "@/components/hammer/WkPrescriptionCard";
import { WkRestDayBanner } from "@/components/hammer/WkRestDayBanner";
import { RunningReadinessLine } from "@/components/hammer/RunningReadinessLine";
import { useRunningReadiness } from "@/hooks/useRunningReadiness";
import { ErrorBoundary } from "@/components/ErrorBoundary";

export function DayNoticesDrawerItem() {
  const { reductions, data, planDate, replanReason, planChangeNotes } = useHammersToday();
  const notices = [...(reductions ?? []), ...(data ?? []).flatMap(row => row.why_payload?.reductions ?? [])].filter((r) => !isDayStatementNotAReduction(r?.detail));
  const extraLines = [replanReason, ...(planChangeNotes ?? []).map(note => note.text), ...(data ?? []).map(row => row.substitution_reason)].filter((line): line is string => typeof line === "string" && line.trim().length > 0);
  const readiness = useRunningReadiness();
  const restDay = (data ?? []).some(row => Boolean((row.why_payload as Record<string, unknown> | null | undefined)?.rest_day));
  const hasReadiness = !readiness.isError && readiness.data !== undefined;
  if (notices.length === 0 && extraLines.length === 0 && !restDay && !hasReadiness) return null;
  const extra = restDay || hasReadiness ? <><WkRestDayBanner /><ErrorBoundary><RunningReadinessLine /></ErrorBoundary></> : null;
  return <DayNoticesCard notices={notices} extraLines={extraLines} extra={extra} planDate={planDate ?? new Date().toISOString().slice(0, 10)} />;
}
