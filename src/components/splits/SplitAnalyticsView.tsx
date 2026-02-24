import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SplitToggle } from './SplitToggle';
import { useSplitAnalytics } from '@/hooks/useSplitAnalytics';
import { splitDefinitions } from '@/data/splitDefinitions';
import { BarChart3 } from 'lucide-react';

interface SplitAnalyticsViewProps {
  category: 'hitting' | 'pitching' | 'fielding';
}

export function SplitAnalyticsView({ category }: SplitAnalyticsViewProps) {
  const [activeSplit, setActiveSplit] = useState('all');
  const { composites } = useSplitAnalytics(activeSplit);

  const sessions = composites.data ?? [];

  // Filter sessions by active split
  const filtered = activeSplit === 'all'
    ? sessions
    : sessions.filter(s => {
        if (activeSplit.startsWith('vs_lh') || activeSplit === 'batting_left') return s.batting_side_used === 'L';
        if (activeSplit.startsWith('vs_rh') || activeSplit === 'batting_right') return s.batting_side_used === 'R';
        return true;
      });

  // Compute aggregate composite
  const compositeValues = filtered
    .map(s => {
      const ci = s.composite_indexes as any;
      if (!ci) return null;
      if (category === 'hitting') return ci.bqi;
      if (category === 'pitching') return ci.pei;
      if (category === 'fielding') return ci.fqi;
      return null;
    })
    .filter((v): v is number => v != null);

  const avg = compositeValues.length > 0
    ? Math.round(compositeValues.reduce((a, b) => a + b, 0) / compositeValues.length)
    : 0;

  const splitLabel = splitDefinitions.find(s => s.id === activeSplit)?.label ?? 'Overall';

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          Split Analytics — {category.charAt(0).toUpperCase() + category.slice(1)}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <SplitToggle category={category} value={activeSplit} onValueChange={setActiveSplit} />

        <div className="rounded-lg border p-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold">{avg}</p>
              <p className="text-xs text-muted-foreground">Composite</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{filtered.length}</p>
              <p className="text-xs text-muted-foreground">Sessions</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{splitLabel}</p>
              <p className="text-xs text-muted-foreground">Active Split</p>
            </div>
          </div>
        </div>

        {composites.isLoading && <p className="text-sm text-muted-foreground">Loading...</p>}
        {!composites.isLoading && filtered.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">No data for this split yet.</p>
        )}
      </CardContent>
    </Card>
  );
}
