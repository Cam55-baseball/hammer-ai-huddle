import { Activity } from "lucide-react";
import { useRunningReadiness } from "@/hooks/useRunningReadiness";
import { readinessLine } from "../../../supabase/functions/_shared/readiness/runningReadiness";

/** One plain line on Today: the running 14-day readiness the plan used. */
export function RunningReadinessLine() {
  const { data, isError } = useRunningReadiness();
  if (isError || data === undefined) return null;
  const text = data === null ? "Readiness from your last 14 days couldn't be read, so today stays normal." : readinessLine(data);
  return (
    <p className="flex items-start gap-2 text-sm text-muted-foreground" aria-label="Running readiness">
      <Activity className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
      <span>{text}</span>
    </p>
  );
}
