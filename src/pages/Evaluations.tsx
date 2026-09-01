import { useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { useScoutAccess } from '@/hooks/useScoutAccess';
import {
  usePendingEvaluations,
  useMyEvaluations,
  useFiledEvaluations,
  useProfileNames,
  useAthleteEvaluators,
} from '@/hooks/useEvaluations';
import { ReportAccordionList } from '@/components/evaluations/ReportAccordionList';
import { PendingEvaluationCard } from '@/components/evaluations/PendingEvaluationCard';
import { EvaluatorDirectory } from '@/components/evaluations/EvaluatorDirectory';
import { PositionGradeSummaryCard } from '@/components/evaluations/PositionGradeSummaryCard';
import { useReportDetails } from '@/hooks/useReportDetails';
import { expandPositionLooks } from '@/lib/evaluation/positionGrades';
import { ConfirmedSummaryCard } from '@/components/evaluations/ConfirmedSummaryCard';
import { formatAttribution } from '@/lib/evaluation/evaluatorCredentials';
import { ArrowLeft, ClipboardList, Loader2, UserPlus, Users } from 'lucide-react';
import { subjectLabel } from '@/lib/evaluation/reportSubject';
import { exportReportPdf } from '@/lib/evaluation/reportPdf';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

/**
 * Evaluations hub.
 *  - "About me": pending confirmations first, then the evaluator directory and
 *    every confirmed report written about the signed-in athlete.
 *  - "Filed by me": every report the signed-in evaluator has written, with the
 *    athlete's confirmation status shown on each.
 */
export default function Evaluations() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { canSendActivities, loading: accessLoading } = useScoutAccess();

  const { data: pending = [], isLoading: pendingLoading } = usePendingEvaluations();
  const { data: mine = [], isLoading: mineLoading } = useMyEvaluations();
  const { data: filed = [], isLoading: filedLoading } = useFiledEvaluations();

  const isEvaluator = canSendActivities;
  // The tab value must be DERIVED, not seeded once. `canSendActivities` is
  // false on the first render (role query still loading), so a useState seed
  // permanently pinned evaluators to "about-me" while only the "filed" panel
  // was mounted — rendering an empty page even though their reports existed.
  const tab = isEvaluator ? 'filed' : 'about-me';

  const athleteIds = useMemo(
    () => filed.map((r) => r.user_id).filter(Boolean) as string[],
    [filed],
  );
  const { data: names = {} } = useProfileNames(athleteIds);
  const [playerFilter, setPlayerFilter] = useState('all');
  const playerOptions = useMemo(
    () => [...new Set(athleteIds)]
      .map((id) => ({ id, name: names[id] ?? 'Athlete' }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    [athleteIds, names],
  );
  const filteredFiled = useMemo(
    () => playerFilter === 'all' ? filed : filed.filter((report) => report.user_id === playerFilter),
    [filed, playerFilter],
  );

  // Child rows: multi-position looks and per-batting-side offensive grades.
  const reportIds = useMemo(
    () => [...filed.map((r) => r.id), ...mine.map((r) => r.id)],
    [filed, mine],
  );
  const { data: details } = useReportDetails(reportIds);

  // Credentials for the people who filed reports on me, so a collapsed row can
  // say who wrote it without opening the report.
  const { data: myEvaluators = [] } = useAthleteEvaluators(user?.id);
  const attributionForMine = (evaluatorId: string | null) => {
    const e = myEvaluators.find((x) => x.evaluator_id === evaluatorId);
    return e ? formatAttribution(e) : undefined;
  };

  const minePositionSources = useMemo(
    () => expandPositionLooks(mine as never, details?.positions ?? []),
    [mine, details],
  );

  const awaiting = filed.filter((r) => !r.player_confirmed).length;


  if (authLoading || accessLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  // Signed-out visitors were seeing the full app shell with an empty hub.
  if (!user) return <Navigate to="/auth" replace />;


  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-4 pb-16">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="Back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-primary" />
              Evaluations
            </h1>
            <p className="text-sm text-muted-foreground">
              Official scouting reports — always attributed, always player-confirmed.
            </p>
          </div>
        </div>

        {isEvaluator && (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate('/evaluations/prospects')}>
              <UserPlus className="h-4 w-4 mr-2" /> Prospect reports
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate('/evaluations/compare')}>
              <Users className="h-4 w-4 mr-2" /> Compare players
            </Button>
          </div>
        )}

        <Tabs value={tab}>
          {isEvaluator ? (
            <>
              {/* Evaluators only see their own filed reports. */}
              <TabsContent value="filed" className="space-y-4 mt-4">
                {filedLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Loading your reports…
                  </div>
                ) : filed.length === 0 ? (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">You haven't filed any reports</CardTitle>
                      <CardDescription>
                        Open a player from your dashboard to file a scouting report.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button variant="outline" onClick={() => navigate('/scout-dashboard')}>
                        Go to dashboard
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="evaluation-player-filter">Player</Label>
                      <Select value={playerFilter} onValueChange={setPlayerFilter}>
                        <SelectTrigger id="evaluation-player-filter" aria-label="Filter evaluations by player">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All players</SelectItem>
                          {playerOptions.map((player) => (
                            <SelectItem key={player.id} value={player.id}>{player.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <ReportAccordionList
                      reports={filteredFiled}
                      details={details}
                      attributionFor={(r) => subjectLabel(r, names)}
                      showConfirmationStatus
                      onExport={(r) =>
                        exportReportPdf({
                          report: r,
                          subject: subjectLabel(r, names),
                          positions: details?.positionsByReport[r.id] ?? [],
                          batSides: details?.batSidesByReport[r.id] ?? [],
                          pitchingSides: details?.pitchingSidesByReport[r.id] ?? [],
                        })
                      }
                      emptyLabel="No evaluations filed for this player."
                    />
                  </div>
                )}

              </TabsContent>
            </>
          ) : (
            <>
              {/* Players only see reports about themselves. */}
              <TabsContent value="about-me" className="space-y-4 mt-4">
                {pendingLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Checking for new reports…
                  </div>
                ) : (
                  pending.map((p) => <PendingEvaluationCard key={p.id} pending={p} />)
                )}

                <ConfirmedSummaryCard reports={mine as unknown as Record<string, unknown>[]} />

                <EvaluatorDirectory athleteId={user?.id} title="Who has evaluated me" />

                <PositionGradeSummaryCard reports={minePositionSources} />

                {mine.length > 0 && (
                  <div className="space-y-2">
                    <h2 className="text-sm font-semibold">Every report about me</h2>
                    <ReportAccordionList
                      reports={mine}
                      details={details}
                      attributionFor={(r) => attributionForMine(r.evaluator_id)}
                    />
                  </div>
                )}




                {!mineLoading && mine.length === 0 && pending.length === 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">No evaluations yet</CardTitle>
                      <CardDescription>
                        When a coach or scout files a report on you, it appears here for you to confirm.
                      </CardDescription>
                    </CardHeader>
                  </Card>
                )}
              </TabsContent>
            </>
          )}
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
