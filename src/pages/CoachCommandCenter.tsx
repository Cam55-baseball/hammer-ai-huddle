import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';
import { useScoutAccess } from '@/hooks/useScoutAccess';
import { useCoachUDL } from '@/hooks/useCoachUDL';
import { PlayerUDLCard } from '@/components/udl/PlayerUDLCard';
import { UDLAlertsBanner } from '@/components/udl/UDLAlertsBanner';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Brain, Users } from 'lucide-react';

export default function CoachCommandCenter() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isCoach } = useScoutAccess();
  const { players, alerts, isLoading, dismissAlert } = useCoachUDL();

  useEffect(() => {
    if (!authLoading && (!user || !isCoach)) {
      navigate('/dashboard');
    }
  }, [user, authLoading, isCoach, navigate]);

  if (authLoading || isLoading) {
    return (
      <DashboardLayout title="Player Intelligence">
        <div className="space-y-4 p-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Player Intelligence">
      <div className="space-y-6 p-4 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Brain className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-xl font-bold">Player Intelligence Command Center</h1>
            <p className="text-sm text-muted-foreground">
              Recommended insights based on player data
            </p>
          </div>
        </div>

        {/* Alerts Banner */}
        {alerts.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold mb-2 flex items-center gap-2">
              Active Alerts ({alerts.length})
            </h2>
            <UDLAlertsBanner alerts={alerts} onDismiss={dismissAlert} />
          </div>
        )}

        {/* Player Cards */}
        {players.length === 0 ? (
          <Card>
            <CardContent className="flex items-center justify-center py-12 text-center">
              <div className="space-y-2">
                <Users className="h-10 w-10 text-muted-foreground mx-auto" />
                <p className="text-muted-foreground">No linked players found.</p>
                <p className="text-xs text-muted-foreground">
                  Players need to accept your follow request and have recent session data.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold">
              Players ({players.length})
            </h2>
            {players.map((player) => (
              <PlayerUDLCard key={player.id} player={player} />
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
