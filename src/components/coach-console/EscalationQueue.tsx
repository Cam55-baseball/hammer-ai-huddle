import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ConfidencePill } from "@/components/command/ConfidencePill";
import { MissingnessChip } from "@/components/command/MissingnessChip";
import { ReplayDrilldownCTA } from "./ReplayDrilldownCTA";
import type { EscalationRow } from "@/lib/coach/projections";
import type { RosterAthlete } from "@/hooks/coach/useCoachRoster";
import { AlertTriangle } from "lucide-react";

interface Props {
  rows: EscalationRow[];
  roster: RosterAthlete[];
}

export function EscalationQueue({ rows, roster }: Props) {
  const nameOf = new Map(roster.map((a) => [a.athleteId, a.displayName]));
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          Escalation queue
          <Badge variant="destructive" className="ml-auto">{rows.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No active escalations. Surfaces here when canonical
            <code className="mx-1 rounded bg-muted px-1 text-[11px]">foundation.pattern.*</code>,
            <code className="mx-1 rounded bg-muted px-1 text-[11px]">behavioral.escalation.*</code>,
            <code className="mx-1 rounded bg-muted px-1 text-[11px]">behavioral.risk.*</code>
            events land.
          </p>
        ) : (
          <ul className="divide-y">
            {rows.map((r) => (
              <li key={r.eventId} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="font-medium">{nameOf.get(r.athleteId) ?? r.athleteId.slice(0, 8)}</span>
                    {r.severity && <Badge variant="destructive" className="text-[10px]">{r.severity}</Badge>}
                    <code className="rounded bg-muted px-1 text-[11px]">{r.topicId}</code>
                  </div>
                  <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">{r.occurredAt}</p>
                </div>
                <div className="flex flex-wrap items-center gap-1">
                  <ConfidencePill confidence={r.confidence} />
                  <MissingnessChip missingness={r.missingness} />
                  <ReplayDrilldownCTA eventId={r.eventId} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
