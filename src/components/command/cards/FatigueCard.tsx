import { BatteryLow } from "lucide-react";
import { IntelligenceCardShell } from "../IntelligenceCardShell";
import { latestByTopicPrefix, projectLatest } from "@/lib/command/projections";
import type { AsbEventRow } from "@/hooks/useAsbTimeline";

interface Props { rows: AsbEventRow[] | undefined; loading?: boolean }

export function FatigueCard({ rows, loading }: Props) {
  const ev = latestByTopicPrefix(rows, "behavioral.fatigue");
  const p = projectLatest<Record<string, unknown>>(ev, { staleAfterHours: 36 });
  const score = (p.value as any)?.score ?? (p.value as any)?.value ?? null;
  return (
    <IntelligenceCardShell
      title="Fatigue"
      subtitle="How tired your body looks today"
      icon={<BatteryLow className="h-4 w-4 text-primary" />}
      projection={p}
      loading={loading}
      emptyMessage="Fatigue appears after your first completed session."
    >
      <div className="flex items-end gap-2">
        <span className="text-3xl font-semibold tabular-nums">
          {typeof score === "number" ? score.toFixed(2) : "—"}
        </span>
        <span className="pb-1 text-xs text-muted-foreground">today</span>
      </div>
    </IntelligenceCardShell>
  );
}
