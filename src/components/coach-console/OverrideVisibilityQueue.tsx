import { Link } from "react-router-dom";
import { RuntimeCard } from "@/components/runtime/RuntimeCard";
import type { AsbEventRow } from "@/hooks/useAsbTimeline";
import { Badge } from "@/components/ui/badge";
import { ArrowRight } from "lucide-react";

/**
 * Pure projection: filters rows for override topics across the roster
 * window and renders a scannable queue, each linked to /replay/:eventId.
 */
export function OverrideVisibilityQueue({
  rowsByAthlete,
  athleteName,
}: {
  rowsByAthlete: Map<string, AsbEventRow[]>;
  athleteName: (id: string) => string;
}) {
  const items: Array<{ athleteId: string; ev: AsbEventRow }> = [];
  rowsByAthlete.forEach((rows, athleteId) => {
    for (const r of rows) {
      if (r.topic_id.startsWith("prescription.override.") || r.topic_id === "session.deviation.logged") {
        items.push({ athleteId, ev: r });
      }
    }
  });
  items.sort((a, b) => (a.ev.occurred_at < b.ev.occurred_at ? 1 : -1));
  const top = items.slice(0, 12);

  return (
    <RuntimeCard eyebrow="Lineage" title="Overrides & deviations">
      {top.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No overrides or deviations on the ledger in this window.
        </p>
      ) : (
        <ul className="space-y-2">
          {top.map(({ athleteId, ev }) => {
            const reason = (ev.payload as any)?.reason ?? "—";
            const severity = (ev.payload as any)?.severity ?? null;
            return (
              <li key={ev.event_id}>
                <Link
                  to={`/replay/${ev.event_id}`}
                  className="flex items-center justify-between gap-2 rounded-md border border-border/60 px-3 py-2 text-sm hover:bg-muted/40"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">
                      {athleteName(athleteId)}
                    </div>
                    <div className="truncate font-mono text-[11px] text-muted-foreground">
                      {ev.topic_id} · {reason}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {severity ? (
                      <Badge variant="outline" className="text-[10px]">
                        {severity}
                      </Badge>
                    ) : null}
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(ev.occurred_at).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </RuntimeCard>
  );
}
