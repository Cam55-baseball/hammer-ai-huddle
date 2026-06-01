/**
 * Phase 154+ — Read-only injury lifecycle strip.
 *
 * Projects `relational.injury.*` events (seeded demo only at this phase).
 * No writes wired; injury authoring lands in a later phase.
 */
import { useAsbTimeline } from "@/hooks/useAsbTimeline";
import type { Scope } from "@/lib/runtime/projections/types";
import { prepareRows } from "@/lib/runtime/projections/types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Props {
  athleteId: string;
  scope: Scope;
}

export function InjuryLifecycleStrip({ athleteId, scope }: Props) {
  const q = useAsbTimeline({ athleteId });
  const rows = prepareRows(q.data?.rows, scope, ["relational.injury."]);
  if (rows.length === 0) {
    return (
      <Card className="p-4">
        <h3 className="font-semibold text-foreground">Injury timeline</h3>
        <p className="text-sm text-muted-foreground">No injury events.</p>
      </Card>
    );
  }
  return (
    <Card className="p-4 space-y-2">
      <h3 className="font-semibold text-foreground">Injury timeline</h3>
      <ol className="space-y-1">
        {rows.map((r) => {
          const p = r.payload as { phase?: string; body_region?: string };
          return (
            <li key={r.event_id} className="text-sm flex items-center gap-2">
              <Badge variant="outline">{p.phase ?? "phase"}</Badge>
              <span className="text-muted-foreground">
                {p.body_region ?? "—"}
              </span>
              <span className="text-xs text-muted-foreground">
                {new Date(r.occurred_at).toLocaleDateString()}
              </span>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}
