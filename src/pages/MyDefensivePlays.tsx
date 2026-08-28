/**
 * Athlete-facing results view for defensive plays logged about them.
 * Read-only — athletes never hand-enter their own defensive plays.
 */
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { useAthleteDefensivePlays } from '@/hooks/useDefensivePlays';
import { DefensivePlayList } from '@/components/defense/DefensivePlayList';
import { Shield } from 'lucide-react';

export default function MyDefensivePlays() {
  const { user } = useAuth();
  const { rows, loading } = useAthleteDefensivePlays(user?.id ?? '');

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-6 pb-16">
        <header className="space-y-1">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" /> My Defensive Plays
          </h1>
          <p className="text-sm text-muted-foreground">
            Every play logged about your defense, with the inputs it was judged on and the runner
            grade the play would have beaten.
          </p>
        </header>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Play log</CardTitle>
            <CardDescription>Newest first.</CardDescription>
          </CardHeader>
          <CardContent>
            <DefensivePlayList
              rows={rows}
              loading={loading}
              emptyLabel="No defensive plays have been logged about you yet."
            />
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
