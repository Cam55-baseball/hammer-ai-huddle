import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { MissingSignalRow } from "@/lib/coach/projections";
import type { RosterAthlete } from "@/hooks/coach/useCoachRoster";
import { EyeOff } from "lucide-react";

interface Props {
  rows: MissingSignalRow[];
  roster: RosterAthlete[];
}

export function MissingSignalQueue({ rows, roster }: Props) {
  const nameOf = new Map(roster.map((a) => [a.athleteId, a.displayName]));
  // sort: no_signal first, then by oldest last_seen_at
  const sorted = [...rows].sort((a, b) => {
    if (a.reason !== b.reason) return a.reason === "no_signal" ? -1 : 1;
    const at = a.lastSeenAt ? Date.parse(a.lastSeenAt) : 0;
    const bt = b.lastSeenAt ? Date.parse(b.lastSeenAt) : 0;
    return at - bt;
  });
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <EyeOff className="h-4 w-4 text-muted-foreground" />
          Missing signals
          <Badge variant="outline" className="ml-auto">{rows.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {sorted.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            All roster athletes have fresh signals across tracked topics.
          </p>
        ) : (
          <ul className="divide-y">
            {sorted.map((r, i) => (
              <li key={`${r.athleteId}-${r.topicPrefix}-${i}`} className="flex items-center gap-3 py-2 text-sm">
                <Link
                  to={`/coach/athlete/${r.athleteId}`}
                  className="min-w-0 flex-1 truncate hover:underline"
                >
                  {nameOf.get(r.athleteId) ?? r.athleteId.slice(0, 8)}
                </Link>
                <code className="rounded bg-muted px-1 text-[11px]">{r.topicPrefix}*</code>
                <Badge
                  variant={r.reason === "no_signal" ? "destructive" : "secondary"}
                  className="text-[10px]"
                >
                  {r.reason}
                </Badge>
                <span className="hidden font-mono text-[10px] text-muted-foreground sm:inline">
                  {r.lastSeenAt ?? `> ${r.thresholdHours}h`}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
