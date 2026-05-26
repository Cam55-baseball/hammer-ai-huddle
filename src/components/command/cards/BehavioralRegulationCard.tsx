import { Brain } from "lucide-react";
import { IntelligenceCardShell } from "../IntelligenceCardShell";
import { latestByTopicPrefix, projectLatest } from "@/lib/command/projections";
import type { AsbEventRow } from "@/hooks/useAsbTimeline";

interface Props { rows: AsbEventRow[] | undefined; loading?: boolean }

export function BehavioralRegulationCard({ rows, loading }: Props) {
  const ev =
    latestByTopicPrefix(rows, "behavioral.regulation") ??
    latestByTopicPrefix(rows, "behavioral.state") ??
    latestByTopicPrefix(rows, "behavioral");
  const p = projectLatest<Record<string, unknown>>(ev, { staleAfterHours: 48 });
  const stateLabel =
    (p.value as any)?.state ??
    (p.value as any)?.label ??
    (p.value as any)?.classification ??
    p.topicId ??
    null;
  return (
    <IntelligenceCardShell
      title="Behavioral regulation"
      subtitle="Most recent behavioral state signal"
      icon={<Brain className="h-4 w-4 text-primary" />}
      projection={p}
      loading={loading}
      emptyMessage="Unlocks once behavioral events accumulate (auto-emitted from your activity)."
    >
      <div className="flex items-end gap-2">
        <span className="font-mono text-xl">{stateLabel ?? "—"}</span>
      </div>
    </IntelligenceCardShell>
  );
}
