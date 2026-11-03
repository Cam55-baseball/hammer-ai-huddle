import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { usePlanRebuildJob } from "@/hooks/usePlanRebuildJob";
import { announceChange } from "@/hooks/useScheduleTimeline";
import { getTodayDate } from "@/utils/dateUtils";

/** Small, non-blocking status line for the background plan update. */
export function PlanUpdatingNote() {
  const { job } = usePlanRebuildJob();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [hidden, setHidden] = useState<string | null>(null);
  if (!job || hidden === `${job.id}:${job.status}`) return null;
  if (job.status === "running") return <p role="status" className="flex items-center gap-1.5 text-xs text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin motion-reduce:animate-none" />Updating your plan… you can keep using the app.</p>;
  if (job.status === "done") return <p role="status" className="text-xs text-muted-foreground">{job.message ?? "Your plan is updated."} <button type="button" className="underline" onClick={() => setHidden(`${job.id}:${job.status}`)}>OK</button></p>;
  return <p role="alert" className="text-xs text-destructive">Your answer is saved, but your plan didn't finish updating. <button type="button" className="underline" onClick={() => user && void announceChange(qc, user.id, job.reason, job.first_date > getTodayDate() ? job.first_date : undefined)}>Try again</button></p>;
}

/** Marks one part of the screen (today, the week, the season card) as updating. */
export function UpdatingBadge() {
  const { updating } = usePlanRebuildJob();
  return updating ? <span className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin motion-reduce:animate-none" />Updating</span> : null;
}
