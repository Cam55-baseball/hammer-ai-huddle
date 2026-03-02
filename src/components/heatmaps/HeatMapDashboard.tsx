import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useHeatMaps } from '@/hooks/useHeatMaps';
import { heatMapTypes, type TimeWindow, type ContextFilter } from '@/data/heatMapConfig';
import { HeatMapGrid } from './HeatMapGrid';
import { HeatMapFilterBar } from './HeatMapFilterBar';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

export function HeatMapDashboard() {
  const [timeWindow, setTimeWindow] = useState<TimeWindow>('30d');
  const [contextFilter, setContextFilter] = useState<ContextFilter>('all');
  const [splitKey, setSplitKey] = useState('all');
  const [handedness, setHandedness] = useState<'R' | 'L'>('R');

  const { data: snapshots, isLoading } = useHeatMaps({
    time_window: timeWindow,
    context_filter: contextFilter,
    split_key: splitKey,
  });

  const snapshotByType = new Map((snapshots ?? []).map(s => [s.map_type, s]));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <HeatMapFilterBar
          timeWindow={timeWindow}
          contextFilter={contextFilter}
          splitKey={splitKey}
          onTimeWindowChange={setTimeWindow}
          onContextFilterChange={setContextFilter}
          onSplitKeyChange={setSplitKey}
        />
        <ToggleGroup
          type="single"
          value={handedness}
          onValueChange={(v) => v && setHandedness(v as 'R' | 'L')}
          size="sm"
          variant="outline"
        >
          <ToggleGroupItem value="R" className="text-xs">RHH</ToggleGroupItem>
          <ToggleGroupItem value="L" className="text-xs">LHH</ToggleGroupItem>
        </ToggleGroup>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {heatMapTypes.map((cfg) => {
          const snap = snapshotByType.get(cfg.id);
          let gridData: number[][] = snap?.grid_data
            ? (snap.grid_data as number[][])
            : Array.from({ length: cfg.gridSize.rows }, () => Array(cfg.gridSize.cols).fill(0));
          const blindZones: number[][] = snap?.blind_zones
            ? (snap.blind_zones as number[][])
            : [];

          // Mirror horizontally for left-handed view
          if (handedness === 'L') {
            gridData = gridData.map(row => [...row].reverse());
          }

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
                    blindZoneThreshold={cfg.blindZoneThreshold}
                    showZoneHighlight={cfg.showZoneHighlight}
                    totalDataPoints={snap?.total_data_points ?? undefined}
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
