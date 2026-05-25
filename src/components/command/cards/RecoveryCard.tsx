import { HeartPulse } from "lucide-react";
import { IntelligenceCardShell } from "../IntelligenceCardShell";
import { latestByTopicPrefix, projectLatest } from "@/lib/command/projections";
import type { AsbEventRow } from "@/hooks/useAsbTimeline";

interface Props { rows: AsbEventRow[] | undefined; loading?: boolean }

export function RecoveryCard({ rows, loading }: Props) {
  const ev =
    latestByTopicPrefix(rows, "behavioral.recovery") ??
    latestByTopicPrefix(rows, "foundation.recovery");
  const p = projectLatest<Record<string, unknown>>(ev, { staleAfterHours: 48 });
  const score = (p.value as any)?.score ?? (p.value as any)?.value ?? null;
  return (
    <IntelligenceCardShell
      title="Recovery"
      subtitle="Latest behavioral/foundation recovery event"
      icon={<HeartPulse className="h-4 w-4 text-primary" />}
      projection={p}
      loading={loading}
    >
      <div className="flex items-end gap-2">
        <span className="font-mono text-3xl tabular-nums">
          {typeof score === "number" ? score.toFixed(2) : "—"}
        </span>
        <span className="text-xs text-muted-foreground">{p.topicId}</span>
      </div>
    </IntelligenceCardShell>
  );
}
