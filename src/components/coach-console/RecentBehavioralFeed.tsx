import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ReplayDrilldownCTA } from "./ReplayDrilldownCTA";
import type { AsbEventRow } from "@/hooks/useAsbTimeline";
import type { RosterAthlete } from "@/hooks/coach/useCoachRoster";
import { MessageSquare } from "lucide-react";

interface Props {
  rows: AsbEventRow[];
  roster: RosterAthlete[];
  limit?: number;
}

export function RecentBehavioralFeed({ rows, roster, limit = 25 }: Props) {
  const nameOf = new Map(roster.map((a) => [a.athleteId, a.displayName]));
  const recent = rows
    .filter((r) => (r.topic_id ?? "").startsWith("behavioral."))
    .slice(0, limit);
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <MessageSquare className="h-4 w-4" /> Recent behavioral events
        </CardTitle>
      </CardHeader>
      <CardContent>
        {recent.length === 0 ? (
          <p className="text-sm text-muted-foreground">No behavioral events in window.</p>
        ) : (
          <ul className="divide-y">
            {recent.map((r) => (
              <li key={r.event_id} className="flex items-center gap-2 py-2 text-sm">
                <span className="w-32 truncate">{nameOf.get(r.athlete_id!) ?? r.athlete_id?.slice(0, 8)}</span>
                <code className="flex-1 truncate rounded bg-muted px-1 text-[11px]">{r.topic_id}</code>
                <span className="hidden font-mono text-[10px] text-muted-foreground sm:inline">{r.occurred_at}</span>
                <ReplayDrilldownCTA eventId={r.event_id} label="" />
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
