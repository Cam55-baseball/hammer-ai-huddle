import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useHeatMaps } from '@/hooks/useHeatMaps';
import { heatMapTypes, type TimeWindow, type ContextFilter } from '@/data/heatMapConfig';
import { HeatMapGrid } from './HeatMapGrid';
import { HeatMapFilterBar } from './HeatMapFilterBar';

export function HeatMapDashboard() {
  const [timeWindow, setTimeWindow] = useState<TimeWindow>('30d');
  const [contextFilter, setContextFilter] = useState<ContextFilter>('all');
  const [splitKey, setSplitKey] = useState('all');

  const { data: snapshots, isLoading } = useHeatMaps({
    time_window: timeWindow,
    context_filter: contextFilter,
    split_key: splitKey,
  });

  const snapshotByType = new Map((snapshots ?? []).map(s => [s.map_type, s]));

  return (
    <div className="space-y-4">
      <HeatMapFilterBar
        timeWindow={timeWindow}
        contextFilter={contextFilter}
        splitKey={splitKey}
        onTimeWindowChange={setTimeWindow}
        onContextFilterChange={setContextFilter}
        onSplitKeyChange={setSplitKey}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {heatMapTypes.map((cfg) => {
          const snap = snapshotByType.get(cfg.id);
          const gridData: number[][] = snap?.grid_data
            ? (snap.grid_data as number[][])
            : Array.from({ length: cfg.gridSize.rows }, () => Array(cfg.gridSize.cols).fill(0));
          const blindZones: number[][] = snap?.blind_zones
            ? (snap.blind_zones as number[][])
            : [];

          return (
            <Card key={cfg.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">{cfg.label}</CardTitle>
              </CardHeader>
              <CardContent>
                {!snap && !isLoading ? (
                  <p className="text-xs text-muted-foreground text-center py-4">No data yet</p>
                ) : (
                  <HeatMapGrid
                    gridSize={cfg.gridSize}
                    gridData={gridData}
                    colorScale={cfg.colorScale}
                    blindZones={blindZones}
                  />
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
