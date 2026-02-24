import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { HeatMapGrid } from '@/components/heatmaps/HeatMapGrid';
import { Map } from 'lucide-react';

interface TeamHeatMapOverlayProps {
  gridData: number[][];
  gridSize: { rows: number; cols: number };
  title?: string;
}

export function TeamHeatMapOverlay({ gridData, gridSize, title = 'Team Heat Map' }: TeamHeatMapOverlayProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Map className="h-5 w-5 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {gridData.length > 0 ? (
          <HeatMapGrid
            gridSize={gridSize}
            gridData={gridData}
            colorScale={['#22c55e', '#eab308', '#ef4444']}
            blindZones={[]}
          />
        ) : (
          <p className="text-sm text-muted-foreground text-center py-8">No team heat map data available yet.</p>
        )}
      </CardContent>
    </Card>
  );
}
