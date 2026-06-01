/**
 * Phase 154+ — Athlete journey map.
 *
 * Read-only composition of developmental stage history + narrative/exposure
 * projections. No frontend-local state.
 */
import { useAsbTimeline } from "@/hooks/useAsbTimeline";
import { useDevelopmentalState } from "@/hooks/useRelationalProjections";
import { prepareRows } from "@/lib/runtime/projections/types";
import type { Scope } from "@/lib/runtime/projections/types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Props {
  athleteId: string;
  scope: Scope;
}

export function AthleteJourneyMap({ athleteId, scope }: Props) {
  const q = useAsbTimeline({ athleteId });
  const { state: dev } = useDevelopmentalState(athleteId, scope);
  const rows = prepareRows(q.data?.rows, scope, [
    "relational.developmental.transition",
    "relational.narrative.",
    "relational.exposure.",
  ]);
  return (
    <Card className="p-4 space-y-2">
      <h3 className="font-semibold text-foreground">Athlete journey</h3>
      <p className="text-xs text-muted-foreground">
        Current stage:{" "}
        <span className="font-mono">{dev.current_stage ?? "unknown"}</span>
      </p>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No journey events yet.
        </p>
      ) : (
        <ol className="space-y-1">
          {rows.map((r) => (
            <li key={r.event_id} className="text-sm flex items-center gap-2">
              <Badge variant="outline">{r.topic_id.split(".").pop()}</Badge>
              <span className="text-xs text-muted-foreground">
                {new Date(r.occurred_at).toLocaleDateString()}
              </span>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}
