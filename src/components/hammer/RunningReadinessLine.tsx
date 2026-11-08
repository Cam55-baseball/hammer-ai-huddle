import { Activity } from "lucide-react";
import { useDayReadiness } from "@/hooks/useDayReadiness";
import { dayReadinessLine } from "../../../supabase/functions/_shared/readiness/recoveryAdjust";

/** One plain line on Today: the running 14-day readiness the plan used, plus today's recovery. */
export function RunningReadinessLine() {
  const { data, isError } = useDayReadiness();
  if (isError || data === undefined) return null;
  const text = data === null || data.running === null
    ? "Readiness from your last 14 days couldn't be read, so today stays normal."
    : dayReadinessLine(data.running, data.adjustment);
  return (
    <p className="flex items-start gap-2 text-sm text-muted-foreground" aria-label="Running readiness">
      <Activity className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
      <span>{text}</span>
    </p>
  );
}
