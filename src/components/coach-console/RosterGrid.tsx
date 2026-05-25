import { AthleteStatusCard } from "./AthleteStatusCard";
import { RosterEmptyState } from "./RosterEmptyState";
import type { RosterAthlete } from "@/hooks/coach/useCoachRoster";
import type { AthleteRosterSnapshot } from "@/lib/coach/projections";

interface Props {
  roster: RosterAthlete[];
  snapshots: AthleteRosterSnapshot[];
  isLoading?: boolean;
}

export function RosterGrid({ roster, snapshots, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-44 animate-pulse rounded-md bg-muted/40" />
        ))}
      </div>
    );
  }
  if (roster.length === 0) return <RosterEmptyState />;

  const snapMap = new Map(snapshots.map((s) => [s.athleteId, s]));
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {roster.map((a) => {
        const snap = snapMap.get(a.athleteId);
        if (!snap) return null;
        return <AthleteStatusCard key={a.athleteId} athlete={a} snapshot={snap} />;
      })}
    </div>
  );
}
