import { DashboardLayout } from '@/components/DashboardLayout';
import { HumanPerformanceCard } from '@/components/hpi/HumanPerformanceCard';
import { PlayerSnapshotCard } from '@/components/hie/PlayerSnapshotCard';
import { WeaknessClusterCard } from '@/components/hie/WeaknessClusterCard';
import { UhrcAthleteSection } from '@/components/report-card/UhrcAthleteSection';
import { ReportCardAccessGate } from '@/components/report-card/hammer/ReportCardAccessGate';
import { ReadinessCard } from '@/components/hie/ReadinessCard';
import { ReadinessBreakdownCard } from '@/components/hie/ReadinessBreakdownCard';
import { SmartWeekPlan } from '@/components/hie/SmartWeekPlan';
import { ProofCard } from '@/components/hie/ProofCard';
import { RiskAlertsCard } from '@/components/hie/RiskAlertsCard';
import { ProProbabilityCard } from '@/components/analytics/ProProbabilityCard';
import { GameIqReports } from '@/components/games/GameIqReports';
import { useGameIqAccess } from '@/hooks/useGameIqAccess';
import { InternalLabel } from '@/components/InternalLabel';
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
// Phase 49: ReportCardTrendStrip import removed.
import { CommandCenterSection } from '@/components/command/CommandCenterSection';
import { WeeklyDigestPreview } from '@/components/dashboard/WeeklyDigestPreview';
import { ForecastPreview } from '@/components/dashboard/ForecastPreview';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Activity, Lightbulb, TrendingUp, ChevronDown, HeartPulse } from 'lucide-react';
import { useState } from 'react';
import { StandardsBoard } from '@/components/hammer/standards/StandardsBoard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Link } from 'react-router-dom';
import { HammersCard } from '@/components/intelligence/HammersCard';
import { howSureFor } from '@/lib/intelligence/howSure';
import { useReadinessState } from '@/hooks/useReadinessState';
import { PerformanceAreaRows } from '@/components/intelligence/PerformanceAreaRows';
import { LearningLoopList } from '@/components/intelligence/LearningLoopList';
import { HealthFlagsCard } from '@/components/intelligence/HealthFlagsCard';

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
              <p className="text-sm text-muted-foreground mt-1">Practice intelligence based on logged sessions and self-reports.</p>
            ) : (
              <p className="text-sm text-muted-foreground mt-1">Start logging sessions to build your practice history.</p>
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

const HASH_TAB: Record<string, GeneralTab> = {
  '#body': 'today',
  '#performance-context': 'performance',
  '#game-iq': 'game-iq',
  '#growth': 'growth',
};
type GeneralTab = 'today' | 'performance' | 'game-iq' | 'growth';

function ReadinessTodayCard() {
  const r = useReadinessState();
  if (r.loading) return null;
  const has = r.hasSignal && r.score !== null;
  const word = r.state === 'green' ? 'Good to go' : r.state === 'yellow' ? 'Take it a bit easier' : r.state === 'red' ? 'Low today' : '';
  return (
    <HammersCard
      title="Ready today"
      weSee={has ? `Readiness score: ${Math.round(r.score as number)} of 100 — ${word}` : 'Readiness score: Not enough data'}
      because={has ? `From ${r.sources.length} recent check-in source${r.sources.length === 1 ? '' : 's'}: ${r.sources.map((s) => s.name).join(', ')}.` : undefined}
      howSure={has ? howSureFor({ samples: r.sources.length, repeatsTogether: true }) : 'need_more_data'}
      samples={has ? r.sources.length : undefined}
      doThis={has ? (r.state === 'red' ? 'Follow today’s plan as written — it already accounts for this.' : 'Do today’s plan. Sleep well tonight.') : 'Do your morning check-in tomorrow.'}
      checkBack="Tomorrow morning, after your check-in."
    />
  );
}

export function Advanced({ hasAdvancedAccess, requireTrainingHistory = true, children }: { hasAdvancedAccess: boolean; requireTrainingHistory?: boolean; children: React.ReactNode }) {
  const content = (
      <div className="space-y-6">
        {hasAdvancedAccess ? children : (
          <UpgradePrompt
            featureName="Advanced Performance Insights"
            featureDescription="Unlock your development analysis, prescriptive actions, readiness tracking, and full intelligence engine."
            variant="full"
          />
        )}
      </div>
  );
  return requireTrainingHistory ? <DataBuildingGate>{content}</DataBuildingGate> : content;
}

export interface GeneralExtras {
  /** Owner-kept landing pieces (season counter, etc.) shown above the tabs. */
  header?: React.ReactNode;
  today?: React.ReactNode;
  performance?: React.ReactNode;
  gameIq?: React.ReactNode;
  growth?: React.ReactNode;
}

export default function ProgressDashboard({ header, today, performance, gameIq, growth }: GeneralExtras = {}) {
  const { modules } = useSubscription();
  const { isOwner } = useOwnerAccess();
  const { snapshot } = useHIESnapshot();
  const hasAdvancedAccess = isOwner || modules.length > 0;
  const selectedSport = (localStorage.getItem('selectedSport') as 'baseball' | 'softball') || 'baseball';
  const [bodyOpen, setBodyOpen] = useState(false);
  const { allowed: gameIqOk, internal: gameIqInternal } = useGameIqAccess();
  const [rawTab, setTab] = useState<GeneralTab>(() => HASH_TAB[typeof window !== 'undefined' ? window.location.hash : ''] ?? 'today');
  const tab: GeneralTab = rawTab === 'game-iq' && !gameIqOk ? 'today' : rawTab;

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
        <DailyOutcomeInlineBanner />

        <div>
          <h1 className="text-3xl font-bold text-foreground">The General</h1>
          <p className="text-muted-foreground">Where you are, what to do next, and how you'll know it worked.</p>
        </div>
        {header}

        <Tabs value={tab} onValueChange={(v) => setTab(v as GeneralTab)} className="space-y-6">
          <TabsList className={`grid w-full ${gameIqOk ? "grid-cols-4" : "grid-cols-3"} h-auto`}>
            <TabsTrigger value="today" className="py-2">Today</TabsTrigger>
            <TabsTrigger value="performance" className="py-2">Performance</TabsTrigger>
            {gameIqOk && <TabsTrigger value="game-iq" className="py-2">Game IQ</TabsTrigger>}
            <TabsTrigger value="growth" className="py-2">Growth</TabsTrigger>
          </TabsList>

          <TabsContent value="today" className="space-y-6">
            <LearningLoopList />
            <ReadinessTodayCard />
            {today}
            <section id="body" className="scroll-mt-20">
              <Collapsible open={bodyOpen} onOpenChange={setBodyOpen}>
                <Card className="border-primary/20">
                  <CollapsibleTrigger asChild>
                    <button
                      type="button"
                      className="w-full flex items-center justify-between gap-3 px-4 sm:px-6 py-4 text-left hover:bg-muted/40 transition-colors rounded-t-lg"
                      aria-expanded={bodyOpen}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2 rounded-full bg-primary/10 shrink-0">
                          <HeartPulse className="h-5 w-5 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-bold text-base sm:text-lg">How your body is doing today</h3>
                          <p className="text-xs text-muted-foreground">Readiness, workload and recovery.</p>
                        </div>
                      </div>
                      <ChevronDown className={`h-5 w-5 text-muted-foreground shrink-0 transition-transform ${bodyOpen ? 'rotate-180' : ''}`} />
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="px-2 sm:px-4 pb-4 pt-2 border-t border-border/40">
                      <CommandCenterSection defaultSignalsOpen={false} />
                    </div>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            </section>
            <NNSuggestionPanel />
            <WeeklyDigestPreview />
            <Advanced hasAdvancedAccess={hasAdvancedAccess}>
              <SmartWeekPlan />
              <ReadinessCard />
              <ReadinessBreakdownCard />
              <AskHammerPanel dashboardContext={dashboardContext} />
            </Advanced>
          </TabsContent>

          <TabsContent value="performance" className="space-y-6">
            <PerformanceAreaRows />
            {performance}
            <section id="performance-context" className="scroll-mt-20"><HumanPerformanceCard /></section>
            <Card className="p-4 flex items-center justify-between gap-3">
              <p className="text-base text-foreground">Your test results live in the Vault.</p>
              <Link to="/vault" className="font-semibold text-primary underline-offset-4 hover:underline">See tests</Link>
            </Card>
            <Collapsible>
              <CollapsibleTrigger className="flex w-full items-center justify-between border-b py-4 text-left font-semibold">Standards Board<ChevronDown className="h-4 w-4" /></CollapsibleTrigger>
              <CollapsibleContent className="pt-3"><StandardsBoard /></CollapsibleContent>
            </Collapsible>
            <ReportCardAccessGate>
              <InternalLabel />
              <UhrcAthleteSection />
            </ReportCardAccessGate>
            <Advanced hasAdvancedAccess={hasAdvancedAccess}>
              <PlayerSnapshotCard />
              <ProProbabilityCard />
            </Advanced>
          </TabsContent>

          {gameIqOk && <TabsContent value="game-iq" className="space-y-6">
            {gameIqInternal && <InternalLabel />}
            {gameIq}
            <section id="game-iq" className="scroll-mt-20">
              <Card className="p-4 flex items-center justify-between gap-3">
                <p className="text-base text-foreground">Your game reports and logged games.</p>
                <Link to="/games/reports" className="font-semibold text-primary underline-offset-4 hover:underline">Open game reports</Link>
              </Card>
            </section>
            <Advanced hasAdvancedAccess={hasAdvancedAccess} requireTrainingHistory={false}>
              <GameIqReports />
            </Advanced>
          </TabsContent>}

          <TabsContent value="growth" className="space-y-6">
            <HealthFlagsCard />
            {growth}
            <section id="growth" className="scroll-mt-20 space-y-6">
              <ForecastPreview />
              <PracticeIntelligenceCard />
              <DualStreakDisplay />
              <ActivityAnalytics selectedSport={selectedSport} />
              <LoadDashboard />
            </section>
            <Advanced hasAdvancedAccess={hasAdvancedAccess}>
              <WeaknessClusterCard />
              <ProofCard />
              <RiskAlertsCard />
            </Advanced>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
