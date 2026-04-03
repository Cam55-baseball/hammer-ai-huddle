import { DashboardLayout } from '@/components/DashboardLayout';
import { PlayerSnapshotCard } from '@/components/hie/PlayerSnapshotCard';
import { WeaknessClusterCard } from '@/components/hie/WeaknessClusterCard';
import { PrescriptiveActionsCard } from '@/components/hie/PrescriptiveActionsCard';
import { ReadinessCard } from '@/components/hie/ReadinessCard';
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

export default function ProgressDashboard() {
  const { modules } = useSubscription();
  const { isOwner } = useOwnerAccess();
  const { snapshot } = useHIESnapshot();
  const hasAdvancedAccess = isOwner || modules.length > 0;

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
        <div>
          <h1 className="text-3xl font-bold text-foreground">Progress Dashboard</h1>
          <p className="text-muted-foreground">Diagnose → Prescribe → Guide → Verify</p>
        </div>

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
