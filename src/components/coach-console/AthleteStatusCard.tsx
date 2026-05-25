import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ConfidencePill } from "@/components/command/ConfidencePill";
import { MissingnessChip } from "@/components/command/MissingnessChip";
import { ReplayDrilldownCTA } from "./ReplayDrilldownCTA";
import type { RosterAthlete } from "@/hooks/coach/useCoachRoster";
import type { AthleteRosterSnapshot } from "@/lib/coach/projections";
import { Activity, Battery, Dumbbell } from "lucide-react";

interface Props {
  athlete: RosterAthlete;
  snapshot: AthleteRosterSnapshot;
}

function MetricRow({
  icon,
  label,
  projection,
}: {
  icon: React.ReactNode;
  label: string;
  projection: AthleteRosterSnapshot["readiness"];
}) {
  return (
    <div className="flex items-center justify-between gap-2 text-xs">
      <div className="flex min-w-0 items-center gap-1.5 text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <div className="flex flex-shrink-0 items-center gap-1">
        <ConfidencePill confidence={projection.confidence} />
        <MissingnessChip missingness={projection.missingness} />
        <ReplayDrilldownCTA eventId={projection.sourceEventId} label="" />
      </div>
    </div>
  );
}

export function AthleteStatusCard({ athlete, snapshot }: Props) {
  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between gap-2 text-base">
          <Link
            to={`/coach/athlete/${athlete.athleteId}`}
            className="truncate hover:underline"
          >
            {athlete.displayName}
          </Link>
          <Badge variant="outline" className="text-[10px]">
            {snapshot.totalEvents} ev
          </Badge>
        </CardTitle>
        <div className="flex flex-wrap gap-1">
          {athlete.sources.map((s) => (
            <Badge key={s} variant="secondary" className="text-[10px]">
              {s}
            </Badge>
          ))}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <MetricRow icon={<Activity className="h-3 w-3" />} label="readiness" projection={snapshot.readiness} />
        <MetricRow icon={<Battery className="h-3 w-3" />} label="fatigue" projection={snapshot.fatigue} />
        <MetricRow icon={<Dumbbell className="h-3 w-3" />} label="workload" projection={snapshot.workload} />
        <p className="pt-1 font-mono text-[10px] text-muted-foreground">
          last event: {snapshot.lastEventAt ?? "—"}
        </p>
      </CardContent>
    </Card>
  );
}
