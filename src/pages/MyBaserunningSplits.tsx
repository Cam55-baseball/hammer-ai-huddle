/**
 * Athlete-facing baserunning results. Read-only — athletes never hand-enter
 * their own splits.
 */
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import {
  useAthleteBaserunningSplits,
  useHomeToFirstScaleRows,
} from '@/hooks/useBaserunningSplits';
import { BaserunningSplitList } from '@/components/baserunning/BaserunningSplitList';
import { Timer } from 'lucide-react';

export default function MyBaserunningSplits() {
  const { user } = useAuth();
  const { rows, loading } = useAthleteBaserunningSplits(user?.id ?? '');
  const { rows: scaleRows } = useHomeToFirstScaleRows();

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-6 pb-16">
        <header className="space-y-1">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Timer className="h-6 w-6 text-primary" /> My Baserunning Splits
          </h1>
          <p className="text-sm text-muted-foreground">
            Every split recorded about your running. Home-to-first times carry their 20–80
            equivalent; the other splits are timed but not yet scale-anchored, so they show the
            raw number only.
          </p>
        </header>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Split log</CardTitle>
            <CardDescription>Newest first.</CardDescription>
          </CardHeader>
          <CardContent>
            <BaserunningSplitList
              rows={rows}
              scaleRows={scaleRows}
              loading={loading}
              emptyLabel="No baserunning splits have been recorded about you yet."
            />
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
