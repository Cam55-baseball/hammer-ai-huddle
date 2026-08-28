/**
 * Athlete-facing read-only combine results.
 * Pre-release: routed behind StaffOnlyRoute until the combine module ships.
 */
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { useMyCombineResults } from '@/hooks/useMyCombineResults';
import { CombineSessionList } from '@/components/combine/CombineSessionList';
import { Timer } from 'lucide-react';

export default function MyCombineResults() {
  const { user } = useAuth();
  const { groups, orphanResults, loading } = useMyCombineResults(user?.id ?? '');

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-6 pb-16">
        <header className="space-y-1">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Timer className="h-6 w-6 text-primary" /> My Combine Results
          </h1>
          <p className="text-sm text-muted-foreground">
            Every combine session recorded for you, grouped by date, with how each number was
            measured.
          </p>
        </header>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Session history</CardTitle>
            <CardDescription>Newest first.</CardDescription>
          </CardHeader>
          <CardContent>
            <CombineSessionList
              groups={groups}
              orphanResults={orphanResults}
              loading={loading}
              emptyLabel="No combine sessions have been recorded for you yet."
            />
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
