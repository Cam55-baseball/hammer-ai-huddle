/**
 * Phase 154+ — Read-only injury lifecycle strip.
 *
 * Projects `relational.injury.*` events. Presentation pass: humanizes phases
 * and the empty state.
 */
import { useAsbTimeline } from "@/hooks/useAsbTimeline";
import type { Scope } from "@/lib/runtime/projections/types";
import { prepareRows } from "@/lib/runtime/projections/types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { INJURY_VOICE, SURFACE_TITLES } from "@/lib/relational/copy";

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
        <h3 className="font-semibold text-foreground">{SURFACE_TITLES.injury}</h3>
        <p className="text-sm text-muted-foreground">{INJURY_VOICE.empty}</p>
      </Card>
    );
  }
  return (
    <Card className="p-4 space-y-2">
      <h3 className="font-semibold text-foreground">{SURFACE_TITLES.injury}</h3>
      <ol className="space-y-1">
        {rows.map((r) => {
          const p = r.payload as { phase?: string; body_region?: string };
          const phaseLabel = INJURY_VOICE.phaseLabels[p.phase ?? ""] ?? p.phase ?? "phase";
          return (
            <li key={r.event_id} className="text-sm flex items-center gap-2">
              <Badge variant="outline">{phaseLabel}</Badge>
              <span className="text-muted-foreground">{p.body_region ?? "—"}</span>
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
