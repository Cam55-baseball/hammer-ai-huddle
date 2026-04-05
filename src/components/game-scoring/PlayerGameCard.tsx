import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SprayChart } from './SprayChart';
import type { BatterStats } from '@/hooks/useGameAnalytics';

interface PlayerGameCardProps {
  stats: BatterStats;
  sport?: 'baseball' | 'softball';
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="text-center">
      <div className="text-sm font-bold tabular-nums">{typeof value === 'number' ? value.toFixed(3).replace(/^0/, '') : value}</div>
      <div className="text-[10px] text-muted-foreground">{label}</div>
    </div>
  );
}

export function PlayerGameCard({ stats, sport = 'baseball' }: PlayerGameCardProps) {
  return (
    <Card>
      <CardHeader className="py-2 px-3">
        <CardTitle className="text-sm">{stats.name}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 px-3 pb-3">
        <div className="grid grid-cols-4 gap-2">
          <Stat label="AVG" value={stats.avg} />
          <Stat label="OBP" value={stats.obp} />
          <Stat label="SLG" value={stats.slg} />
          <Stat label="OPS" value={stats.ops} />
        </div>
        <div className="grid grid-cols-5 gap-2">
          <Stat label="PA" value={stats.pa} />
          <Stat label="H" value={stats.hits} />
          <Stat label="RBI" value={stats.rbi} />
          <Stat label="K%" value={`${stats.kPct.toFixed(0)}%`} />
          <Stat label="BB%" value={`${stats.bbPct.toFixed(0)}%`} />
        </div>
        {stats.sprayData.length > 0 && (
          <div>
            <span className="text-xs font-medium text-muted-foreground">Spray Chart</span>
            <SprayChart data={stats.sprayData} size={160} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
