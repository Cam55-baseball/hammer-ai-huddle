import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { PitcherStats } from '@/hooks/useGameAnalytics';

interface PitcherTrackerProps {
  stats: PitcherStats | undefined;
}

function StatRow({ label, value, unit }: { label: string; value: string | number; unit?: string }) {
  return (
    <div className="flex justify-between items-center py-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xs font-bold">{typeof value === 'number' ? value.toFixed(1) : value}{unit || ''}</span>
    </div>
  );
}

export function PitcherTracker({ stats }: PitcherTrackerProps) {
  if (!stats) {
    return (
      <Card>
        <CardContent className="py-6 text-center text-xs text-muted-foreground">
          No pitcher data yet
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="py-2 px-3">
        <CardTitle className="text-sm">{stats.name} — Pitching</CardTitle>
      </CardHeader>
      <CardContent className="space-y-0.5 px-3 pb-3">
        <StatRow label="Pitch Count" value={stats.pitchCount} />
        <StatRow label="Strikes / Balls" value={`${stats.strikes} / ${stats.balls}`} />
        <StatRow label="Velocity Avg" value={stats.velocityAvg} unit=" mph" />
        <StatRow label="Velocity Peak" value={stats.velocityPeak} unit=" mph" />
        <StatRow label="1st Pitch Strike %" value={stats.firstPitchStrikePct} unit="%" />
        <StatRow label="K%" value={stats.kPct} unit="%" />
        <StatRow label="BB%" value={stats.bbPct} unit="%" />
        <StatRow label="Zone %" value={stats.zonePct} unit="%" />
        <StatRow label="Swing & Miss %" value={stats.swingMissPct} unit="%" />

        {Object.keys(stats.pitchTypeCounts).length > 0 && (
          <div className="pt-2 border-t mt-2">
            <span className="text-xs font-medium text-muted-foreground">Pitch Mix</span>
            {Object.entries(stats.pitchTypeCounts).map(([type, count]) => (
              <StatRow key={type} label={type} value={count} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
