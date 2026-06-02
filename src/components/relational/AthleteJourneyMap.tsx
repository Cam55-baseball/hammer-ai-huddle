/**
 * Phase 154+ — Athlete journey map.
 *
 * Read-only composition of developmental stage history + narrative/exposure
 * projections. Presentation pass: humanizes the "today" line and topic chips.
 */
import { useAsbTimeline } from "@/hooks/useAsbTimeline";
import { useDevelopmentalState } from "@/hooks/useRelationalProjections";
import { prepareRows } from "@/lib/runtime/projections/types";
import type { Scope } from "@/lib/runtime/projections/types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DEVELOPMENTAL_VOICE, JOURNEY_VOICE, SURFACE_TITLES, NARRATIVE_VOICE } from "@/lib/relational/copy";

interface Props {
  athleteId: string;
  scope: Scope;
}

// Topic labels live in `JOURNEY_VOICE.topicLabels` (canonical copy).


export function AthleteJourneyMap({ athleteId, scope }: Props) {
  const q = useAsbTimeline({ athleteId });
  const { state: dev } = useDevelopmentalState(athleteId, scope);
  const rows = prepareRows(q.data?.rows, scope, [
    "relational.developmental.transition",
    "relational.narrative.",
    "relational.exposure.",
  ]);
  const stageKey = dev.current_stage ?? "unknown";
  const stageLabel = DEVELOPMENTAL_VOICE.stages[stageKey] ?? stageKey;
  return (
    <Card className="p-4 space-y-2">
      <h3 className="font-semibold text-foreground">{SURFACE_TITLES.journey}</h3>
      <p className="text-xs text-muted-foreground">
        {JOURNEY_VOICE.currentStage(stageLabel)}
      </p>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">{JOURNEY_VOICE.empty}</p>
      ) : (
        <ol className="space-y-1">
          {rows.map((r) => {
            const tail = r.topic_id.split(".").pop() ?? "";
            // RR-5: narrative markers get observational labels from copy.ts.
            const isNarrative = r.topic_id.startsWith("relational.narrative.");
            const label = isNarrative
              ? NARRATIVE_VOICE.journeyMarkers[tail] ?? tail
              : JOURNEY_VOICE.topicLabels[tail] ?? tail;
            return (
              <li key={r.event_id} className="text-sm flex items-center gap-2">
                <Badge variant="outline">{label}</Badge>
                <span className="text-xs text-muted-foreground">
                  {new Date(r.occurred_at).toLocaleDateString()}
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </Card>
  );
}
