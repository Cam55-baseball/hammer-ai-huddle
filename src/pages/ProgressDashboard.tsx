import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { MPIScoreCard } from '@/components/analytics/MPIScoreCard';
import { ProProbabilityCard } from '@/components/analytics/ProProbabilityCard';
import { RankMovementBadge } from '@/components/analytics/RankMovementBadge';
import { HoFCountdown } from '@/components/analytics/HoFCountdown';
import { IntegrityScoreBar } from '@/components/analytics/IntegrityScoreBar';
import { AIPromptCard } from '@/components/analytics/AIPromptCard';
import { DeltaTrendChart } from '@/components/analytics/DeltaTrendChart';
import { DataBuildingGate } from '@/components/analytics/DataBuildingGate';
import { RoadmapBlockedBadge } from '@/components/analytics/RoadmapBlockedBadge';
import { HeatMapDashboard } from '@/components/heatmaps/HeatMapDashboard';
import { useRoadmapProgress } from '@/hooks/useRoadmapProgress';
import { CheckCircle2, Circle, Loader2, Lock } from 'lucide-react';

function RoadmapSection() {
  const { milestones, progress } = useRoadmapProgress();
  const milestonesData = milestones.data ?? [];
  const progressData = progress.data ?? [];

  const progressMap = new Map(progressData.map(p => [p.milestone_id, p]));

  if (milestones.isLoading) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Development Roadmap</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {milestonesData.length === 0 ? (
          <p className="text-sm text-muted-foreground">Complete sessions to unlock milestones.</p>
        ) : (
          milestonesData.map((m) => {
            const p = progressMap.get(m.id);
            const status = p?.status ?? 'locked';
            const pct = p?.progress_pct ?? 0;

            return (
              <div key={m.id} className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-sm min-w-0">
                    {status === 'completed' ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                    ) : status === 'in_progress' ? (
                      <Loader2 className="h-4 w-4 text-primary animate-spin shrink-0" />
                    ) : status === 'blocked' ? (
                      <Lock className="h-4 w-4 text-amber-500 shrink-0" />
                    ) : (
                      <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
                    )}
                    <span className="truncate">{m.milestone_name}</span>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">{Math.round(pct)}%</span>
                </div>
                <Progress value={pct} className="h-1.5" />
                {status === 'blocked' && p?.blocked_reason && (
                  <RoadmapBlockedBadge reason={p.blocked_reason} />
                )}
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}

export default function ProgressDashboard() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Progress Dashboard</h1>
          <p className="text-muted-foreground">Your MPI score, rankings, and development roadmap</p>
        </div>

        <DataBuildingGate>
          <div className="space-y-6">
            {/* Row 1: Score cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <MPIScoreCard />
              <ProProbabilityCard />
              <RankMovementBadge />
            </div>

            {/* Row 2: HoF + Integrity */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <HoFCountdown />
              <IntegrityScoreBar />
            </div>

            {/* Row 3: AI Prompts */}
            <AIPromptCard />

            {/* Row 4: Delta Trend */}
            <DeltaTrendChart />

            {/* Row 5: Roadmap */}
            <RoadmapSection />

            {/* Row 6: Heat Maps */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Performance Heat Maps</CardTitle>
              </CardHeader>
              <CardContent>
                <HeatMapDashboard />
              </CardContent>
            </Card>
          </div>
        </DataBuildingGate>
      </div>
    </DashboardLayout>
  );
}
