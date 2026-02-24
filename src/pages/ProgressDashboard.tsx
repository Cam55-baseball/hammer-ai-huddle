import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useMPIScores } from '@/hooks/useMPIScores';
import { TrendingUp, TrendingDown, Minus, Trophy, Target, BarChart3 } from 'lucide-react';

export default function ProgressDashboard() {
  const { data: mpi, isLoading } = useMPIScores();

  const trendIcon = mpi?.trend_direction === 'rising' ? TrendingUp : mpi?.trend_direction === 'dropping' ? TrendingDown : Minus;
  const TrendIcon = trendIcon;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Progress Dashboard</h1>
          <p className="text-muted-foreground">Your MPI score, rankings, and development roadmap</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <BarChart3 className="h-4 w-4" /> MPI Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-12 bg-muted animate-pulse rounded" />
              ) : mpi ? (
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold">{Math.round(mpi.adjusted_global_score || 0)}</span>
                  <TrendIcon className={`h-5 w-5 ${mpi.trend_direction === 'rising' ? 'text-green-500' : mpi.trend_direction === 'dropping' ? 'text-red-500' : 'text-muted-foreground'}`} />
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">Log sessions to build your MPI score</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Trophy className="h-4 w-4" /> Global Rank
              </CardTitle>
            </CardHeader>
            <CardContent>
              {mpi ? (
                <div>
                  <span className="text-4xl font-bold">#{mpi.global_rank || '—'}</span>
                  <span className="text-sm text-muted-foreground ml-2">of {mpi.total_athletes_in_pool || 0}</span>
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">Not yet ranked</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Target className="h-4 w-4" /> Pro Probability
              </CardTitle>
            </CardHeader>
            <CardContent>
              {mpi ? (
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold">{(mpi.pro_probability || 0).toFixed(1)}%</span>
                  {mpi.pro_probability_capped && (
                    <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">Pre-MLB</span>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">Build data to calculate</p>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Development Roadmap</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">Complete practice sessions to unlock milestones and progress through your development roadmap.</p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
