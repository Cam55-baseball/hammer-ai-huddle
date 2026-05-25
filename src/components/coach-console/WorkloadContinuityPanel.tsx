import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { WorkloadContinuity } from "@/lib/coach/projections";
import type { RosterAthlete } from "@/hooks/coach/useCoachRoster";
import { Dumbbell } from "lucide-react";

interface Props {
  rows: WorkloadContinuity[];
  roster: RosterAthlete[];
}

export function WorkloadContinuityPanel({ rows, roster }: Props) {
  const nameOf = new Map(roster.map((a) => [a.athleteId, a.displayName]));
  const sorted = [...rows].sort((a, b) => a.last7dCount - b.last7dCount);
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Dumbbell className="h-4 w-4" /> Workload continuity (raw counts)
        </CardTitle>
      </CardHeader>
      <CardContent>
        {sorted.length === 0 ? (
          <p className="text-sm text-muted-foreground">No analytics.* events in window.</p>
        ) : (
          <ul className="divide-y">
            {sorted.map((r) => (
              <li key={r.athleteId} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 py-2 text-sm">
                <Link to={`/coach/athlete/${r.athleteId}`} className="truncate hover:underline">
                  {nameOf.get(r.athleteId) ?? r.athleteId.slice(0, 8)}
                </Link>
                <span className="font-mono text-xs text-muted-foreground">
                  prior 7d: {r.prior7dCount}
                </span>
                <span className="font-mono text-xs">last 7d: {r.last7dCount}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
