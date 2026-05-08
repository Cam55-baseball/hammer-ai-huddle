import { DashboardLayout } from '@/components/DashboardLayout';
import { PlayerSnapshotCard } from '@/components/hie/PlayerSnapshotCard';
import { WeaknessClusterCard } from '@/components/hie/WeaknessClusterCard';
import { PrescriptiveActionsCard } from '@/components/hie/PrescriptiveActionsCard';
import { ReadinessCard } from '@/components/hie/ReadinessCard';
import { ReadinessBreakdownCard } from '@/components/hie/ReadinessBreakdownCard';
import { SmartWeekPlan } from '@/components/hie/SmartWeekPlan';
import { ProofCard } from '@/components/hie/ProofCard';
import { RiskAlertsCard } from '@/components/hie/RiskAlertsCard';
import { ProProbabilityCard } from '@/components/analytics/ProProbabilityCard';
import { HeatMapDashboard } from '@/components/heatmaps/HeatMapDashboard';
import { AskHammerPanel } from '@/components/analytics/AskHammerPanel';
import { DataBuildingGate } from '@/components/analytics/DataBuildingGate';
import { useSubscription } from '@/hooks/useSubscription';
import { useOwnerAccess } from '@/hooks/useOwnerAccess';
import { useHIESnapshot } from '@/hooks/useHIESnapshot';
import { UpgradePrompt } from '@/components/UpgradePrompt';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DualStreakDisplay } from '@/components/dashboard/DualStreakDisplay';
import { ActivityAnalytics } from '@/components/custom-activities/ActivityAnalytics';
import { LoadDashboard } from '@/components/elite-workout/intelligence/LoadDashboard';
import { NNSuggestionPanel } from '@/components/identity/NNSuggestionPanel';
import { DailyOutcomeInlineBanner } from '@/components/identity/DailyOutcomeInlineBanner';
import { useMPIScores } from '@/hooks/useMPIScores';
import { useAIPrompts } from '@/hooks/useAIPrompts';
import { getGradeLabel } from '@/lib/gradeLabel';
import { Activity, Lightbulb, TrendingUp } from 'lucide-react';

function PracticeIntelligenceCard() {
  const { data: mpi } = useMPIScores();
  const { prompts, hasPrompts } = useAIPrompts();

  const gradeLabel = mpi?.adjusted_global_score
    ? getGradeLabel(mpi.adjusted_global_score)
    : null;

  return (
    <Card className="p-4 sm:p-6 border-primary/20">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-full bg-primary/10">
            <Activity className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h3 className="font-bold text-lg">Practice Intelligence</h3>
            {mpi ? (
              <div className="flex items-center gap-2 mt-1">
                <span className="text-2xl font-bold">{mpi.adjusted_global_score ?? '—'}</span>
                <span className="text-sm text-muted-foreground">MPI • {gradeLabel}</span>
                {mpi.trend_direction === 'rising' && <TrendingUp className="h-4 w-4 text-green-600" />}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground mt-1">Start logging sessions to build your MPI score</p>
            )}
          </div>
        </div>
      </div>
      {hasPrompts && prompts[0] && (
        <div className="mt-3 flex items-start gap-2 rounded-lg bg-muted/30 p-2">
          <Lightbulb className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground">{prompts[0]}</p>
        </div>
      )}
    </Card>
  );
}

export default function ProgressDashboard() {
  const { modules } = useSubscription();
  const { isOwner } = useOwnerAccess();
  const { snapshot } = useHIESnapshot();
  const hasAdvancedAccess = isOwner || modules.length > 0;
  const selectedSport = (localStorage.getItem('selectedSport') as 'baseball' | 'softball') || 'baseball';

  const dashboardContext = snapshot ? `
MPI Score: ${snapshot.mpi_score ?? 'N/A'}
Development Status: ${snapshot.development_status}
Primary Limiter: ${snapshot.primary_limiter ?? 'N/A'}
Readiness: ${snapshot.readiness_score}%
Confidence: ${snapshot.development_confidence}%
  `.trim() : '';

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Authoritative passive verdict — sourced from useDailyOutcome */}
        <DailyOutcomeInlineBanner />

        <div>
          <h1 className="text-3xl font-bold text-foreground">Progress Dashboard</h1>
          <p className="text-muted-foreground">Diagnose → Prescribe → Guide → Verify</p>
        </div>

        {/* Always-visible top sections */}
        <NNSuggestionPanel />
        <PracticeIntelligenceCard />
        <DualStreakDisplay />
        <ActivityAnalytics selectedSport={selectedSport} />
        <LoadDashboard />

        <DataBuildingGate>
          <div className="space-y-6">
            {hasAdvancedAccess ? (
              <>
                {/* Section 1: Player Snapshot */}
                <PlayerSnapshotCard />

                {/* Section 2: What's Holding You Back */}
                <WeaknessClusterCard />

                {/* Section 3: What To Do Next */}
                <PrescriptiveActionsCard />

                {/* Section 4: Today's Readiness */}
                <ReadinessCard />

                {/* Risk Alerts */}
                <RiskAlertsCard />

                {/* Ask Hammer AI Chat */}
                <AskHammerPanel dashboardContext={dashboardContext} />

                {/* Section 5: Smart Week Plan */}
                <SmartWeekPlan />

                {/* Section 6: Proof It's Working */}
                <ProofCard />

                {/* Pro Probability - kept but gated */}
                <ProProbabilityCard />

                {/* Heat Maps */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Performance Heat Maps</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <HeatMapDashboard />
                  </CardContent>
                </Card>
              </>
            ) : (
              <UpgradePrompt
                featureName="Advanced Performance Insights"
                featureDescription="Unlock your development analysis, prescriptive actions, readiness tracking, and full intelligence engine."
                variant="full"
              />
            )}
          </div>
        </DataBuildingGate>
      </div>
    </DashboardLayout>
  );
}
