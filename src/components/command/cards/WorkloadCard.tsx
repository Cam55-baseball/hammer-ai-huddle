import { Dumbbell } from "lucide-react";
import { IntelligenceCardShell } from "../IntelligenceCardShell";
import { projectLatest, windowCount, EMPTY_PROJECTION } from "@/lib/command/projections";
import type { AsbEventRow } from "@/hooks/useAsbTimeline";

interface Props { rows: AsbEventRow[] | undefined; loading?: boolean }

export function WorkloadCard({ rows, loading }: Props) {
  const { count, latest } = windowCount(rows, "athlete.schedule.day_type", 7);
  const p = latest ? projectLatest(latest, { staleAfterHours: 168 }) : EMPTY_PROJECTION;
  return (
    <IntelligenceCardShell
      title="Workload"
      subtitle="How much load you've been carrying (last 7 days)"
      icon={<Dumbbell className="h-4 w-4 text-primary" />}
      projection={p}
      loading={loading}
      emptyMessage="No scheduled days yet"
    >
      <div className="flex items-end gap-3">
        <span className="text-3xl font-semibold tabular-nums">{count}</span>
        <span className="pb-1 text-xs text-muted-foreground">training days this week</span>
      </div>
    </IntelligenceCardShell>
  );
}
