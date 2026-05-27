import { Link } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import { IntelligenceCardShell } from "../IntelligenceCardShell";
import { TopicLabel } from "../TopicLabel";
import { projectLatest, EMPTY_PROJECTION } from "@/lib/command/projections";
import type { AsbEventRow } from "@/hooks/useAsbTimeline";

interface Props { rows: AsbEventRow[] | undefined; loading?: boolean }

const ESC_PREFIXES = ["foundation.pattern", "behavioral.escalation", "behavioral.risk"];

function isEscalation(topic: string): boolean {
  return ESC_PREFIXES.some((p) => topic === p || topic.startsWith(p + "."));
}

export function EscalationFlagsCard({ rows, loading }: Props) {
  const cutoff = Date.now() - 72 * 3600 * 1000;
  const items = (rows ?? []).filter((r) => {
    if (!isEscalation(r.topic_id)) return false;
    const t = Date.parse(r.occurred_at);
    return !Number.isNaN(t) && t >= cutoff;
  });
  const p = items[0] ? projectLatest(items[0]) : EMPTY_PROJECTION;
  const hasItems = items.length > 0;

  return (
    <IntelligenceCardShell
      title="Needs Attention"
      subtitle="Things from the last 3 days that need a look"
      icon={<AlertTriangle className="h-4 w-4 text-destructive" />}
      projection={p}
      loading={loading}
      destructive={hasItems}
      emptyMessage="Nothing needs attention right now"
    >
      <ul className="space-y-1.5">
        {items.slice(0, 6).map((r) => (
          <li key={r.event_id} className="flex items-center justify-between gap-2 text-sm">
            <TopicLabel id={r.topic_id} className="min-w-0 flex-1" />
            <Link
              to={`/replay/${r.event_id}`}
              className="shrink-0 text-xs text-primary underline-offset-2 hover:underline"
            >
              see why →
            </Link>
          </li>
        ))}
      </ul>
    </IntelligenceCardShell>
  );
}
