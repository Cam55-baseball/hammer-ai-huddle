import { Link } from "react-router-dom";
import { topicLabel } from "@/lib/asb/topicLabels";
import type { AsbEventRow } from "@/hooks/useAsbTimeline";

interface Props {
  rows: AsbEventRow[];
}

/** Horizontal canonical-event spine. Each chip drills to /replay/:eventId. */
export function DigestTimelineStrip({ rows }: Props) {
  const sorted = [...rows]
    .sort((a, b) => a.occurred_at.localeCompare(b.occurred_at))
    .slice(-30);
  if (sorted.length === 0) return null;
  return (
    <div className="rounded-md border bg-card p-3">
      <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        Canonical event spine
      </p>
      <div className="flex snap-x snap-mandatory gap-2 overflow-x-auto pb-2">
        {sorted.map((r) => (
          <Link
            key={r.event_id}
            to={`/replay/${r.event_id}`}
            className="snap-start rounded border bg-background px-2 py-1 text-[11px] text-muted-foreground hover:border-primary hover:text-foreground"
            title={`${r.topic_id} @ ${r.occurred_at}`}
          >
            <div className="truncate max-w-[160px] font-medium text-foreground">
              {topicLabel(r.topic_id)}
            </div>
            <div className="truncate max-w-[160px] font-mono text-[10px]">
              {r.topic_id}
            </div>
            <div className="font-mono text-[10px]">
              {r.occurred_at.slice(5, 16).replace("T", " ")}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
