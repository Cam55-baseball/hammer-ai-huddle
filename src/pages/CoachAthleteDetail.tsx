import { CoachMessageBox } from "@/components/coach/CoachMessageBox";
import { CoachDrillAssign } from "@/components/coach/CoachDrillAssign";
import { CoachAthleteSummary } from "@/components/coach/CoachAthleteSummary";
import { CoachTestsTab, CoachPrivateNotes } from "@/components/coach/CoachTestsAndNotes";
import { CoachTrendsTab } from "@/components/coach/CoachTrendsTab";
import { CoachLoadTab } from "@/components/coach/CoachLoadTab";
import { CoachGamesTab } from "@/components/coach/CoachGamesTab";
import { CoachReadinessTab } from "@/components/coach/CoachReadinessTab";
import { CoachReportsTab, CoachGradesTab, CoachRecapTab } from "@/components/coach/CoachReportsTab";
import { CoachDevelopmentTab } from "@/components/coach/CoachDevelopmentTab";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfidencePill } from "@/components/command/ConfidencePill";
import { MissingnessChip } from "@/components/command/MissingnessChip";
import { ReplayDrilldownCTA } from "@/components/coach-console/ReplayDrilldownCTA";
import { PieV2CoachPanel } from "@/components/coach/PieV2CoachPanel";
// Phase 49: PieV2HammerBriefPanel import removed (no longer mounted).
import { PieV2RecruitingCard } from "@/components/recruiting/PieV2RecruitingCard";
import { HittingRecruitingCard } from "@/components/recruiting/HittingRecruitingCard";
import { RecruitingVisibilityGate } from "@/components/recruiting/RecruitingVisibilityGate";
import { HittingDoctrineBlock } from "@/components/hitting/HittingDoctrineBlock";
// Phase 49: UhrcReportCard, HammerReportCardAggregate, ReportCardTrendStrip, buildUhrcReport imports removed.
import { usePitchingV2Trends } from "@/hooks/usePitchingV2Trends";
import { trajectoriesAll } from "@/lib/pieV2/longitudinal";
import { snapshotAthlete } from "@/lib/coach/projections";
import type { AsbEventRow } from "@/hooks/useAsbTimeline";
import { useEmitOnce } from "@/hooks/useEmitObservability";
import { ArrowLeft, ShieldAlert } from "lucide-react";
import { SafetyMenu } from "@/components/safety/SafetyMenu";
import { isBlockedPair } from "@/lib/safety/blocks";


const COLS =
  "event_id, athlete_id, topic_id, actor_role, actor_id, occurred_at, ingested_at, effective_at, valid_from, valid_to, payload, engine_version, idempotency_key, causality_refs, lineage_refs";

export default function CoachAthleteDetail() {
  const { athleteId } = useParams<{ athleteId: string }>();
  const { user } = useAuth();

  // P0-REC-3 — roster membership guard. A coach may only drill into an
  // athlete present in their accepted scout_follows roster. Prevents
  // arbitrary UUID enumeration of athlete event streams.
  const { data: rosterAccess, isLoading: checkingAccess } = useQuery({
    queryKey: ["coach-roster-access", user?.id, athleteId],
    enabled: !!user?.id && !!athleteId,
    queryFn: async () => {
      if (!user?.id || !athleteId) return false;
      if (user.id === athleteId) return true; // self-view always allowed
      // Apple Guideline 1.2 — a block is enforced in the data layer, not just
      // by hiding buttons. Blocked pairs never resolve as linked.
      if (await isBlockedPair(user.id, athleteId)) return false;
      const { data, error } = await supabase
        .from("scout_follows")
        .select("id")
        .eq("scout_id", user.id)
        .eq("player_id", athleteId)
        .eq("status", "accepted")
        .maybeSingle();
      if (!error && data) return true;
      // Org coaches reach their assigned athletes through org_athlete_assignments
      // (server-checked), not scout_follows — same roster, different doorway.
      const { data: isCoach } = await supabase.rpc("is_coach_of", {
        _coach: user.id,
        _athlete: athleteId,
      });
      return isCoach === true;
    },
  });

  // RFL-005 — emit canonical coach.review.opened once per (coach, athlete) per day.
  // Gated on roster access so unauthorized opens never emit.
  useEmitOnce(
    user?.id && athleteId && rosterAccess === true && user.id !== athleteId
      ? `coach_review:${user.id}:${athleteId}`
      : null,
    user?.id && athleteId && rosterAccess === true && user.id !== athleteId
      ? {
          topic: "coach.review.opened",
          athleteId,
          actorId: user.id,
          actorRole: "coach",
          payload: { surface: "coach_athlete_detail" },
        }
      : null,
  );



  // ── HITTING DOCTRINE (single source of truth — same JSON read by athlete) ──
  const { data: hittingDoctrineSnap } = useQuery({
    queryKey: ["coach-hie-doctrine", athleteId],
    enabled: !!athleteId && rosterAccess === true,
    queryFn: async () => {
      if (!athleteId) return null;
      const { data, error } = await supabase
        .from("hie_snapshots")
        .select("hitting_doctrine, computed_at, sport")
        .eq("user_id", athleteId)
        .order("computed_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data as any) ?? null;
    },
  });

  const { data: pieV2Trends } = usePitchingV2Trends(athleteId ?? "");
  const pieV2_30d = pieV2Trends?.find((w) => w.window === "30d");
  const pieV2Latest = pieV2_30d?.aggregates[pieV2_30d.aggregates.length - 1];
  const pieV2Trajectories = pieV2_30d ? trajectoriesAll(pieV2_30d.aggregates) : [];

  const { data: rows = [], isLoading, error } = useQuery({
    queryKey: ["coach-athlete-rows", athleteId],
    enabled: !!athleteId && rosterAccess === true,
    queryFn: async (): Promise<AsbEventRow[]> => {
      const since = new Date(Date.now() - 30 * 86400 * 1000).toISOString();
      const { data, error } = await supabase
        .from("asb_events")
        .select(COLS)
        .eq("athlete_id", athleteId!)
        .gte("occurred_at", since)
        .order("occurred_at", { ascending: false })
        .order("event_id", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as AsbEventRow[];
    },
  });

  const snap = athleteId && rosterAccess === true ? snapshotAthlete(athleteId, rows) : null;

  // Header shows the player's name (same profile read as the summary card), never the raw ID.
  const { data: headerName } = useQuery({
    queryKey: ["coach-athlete-header-name", athleteId],
    enabled: !!athleteId && rosterAccess === true,
    queryFn: async () => {
      const { data } = await supabase.rpc("coach_athlete_glance", { _athlete: athleteId! });
      return ((data as any)?.profile?.full_name as string | null) ?? null;
    },
  });

  if (!checkingAccess && rosterAccess === false) {
    return (
      <DashboardLayout>
        <div className="mx-auto max-w-xl space-y-4 p-6">
          <Card className="border-destructive/40 bg-destructive/5">
            <CardHeader className="flex flex-row items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-destructive" />
              <CardTitle className="text-base">Not on your roster</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>
                This athlete isn't in your accepted roster. Coaches may only
                view athletes who've accepted a follow request. This guard
                enforces RR-9 exposure ethics and prevents enumeration of
                event streams by UUID.
              </p>
              <Button asChild variant="outline" size="sm">
                <Link to="/coach/console"><ArrowLeft className="mr-1 h-4 w-4" /> Back to roster</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }


  return (
    <DashboardLayout>
      <div className="space-y-6 p-4 md:p-6">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm">
            <Link to="/coach/console"><ArrowLeft className="mr-1 h-4 w-4" /> Back to roster</Link>
          </Button>
          <h1 className="text-xl font-bold">
            <span className="sr-only">Athlete: </span>
            {headerName?.trim() || "Athlete"}
          </h1>
          {athleteId && (
            <SafetyMenu
              reportedUserId={athleteId}
              contentType="profile"
              contentId={athleteId}
              label="this athlete"
              className="ml-auto h-8 w-8 text-muted-foreground"
            />
          )}
        </div>

        {error && (
          <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
            {(error as Error).message}
          </div>
        )}

        {/* Plan v3.1 Phase 5 — coach page organized into tabs so a coach on a
            phone can reach messages, training and activity without a long scroll. */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid h-auto w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="development">Development</TabsTrigger>
            <TabsTrigger value="training">Training</TabsTrigger>
            <TabsTrigger value="messages">Messages</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
            <TabsTrigger value="tests">Tests</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
            <TabsTrigger value="load">Body load</TabsTrigger>
            <TabsTrigger value="games">Game stats</TabsTrigger>
            <TabsTrigger value="readiness">Readiness &amp; pain</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
            <TabsTrigger value="grades">Grades</TabsTrigger>
            <TabsTrigger value="recap">Six-week recap</TabsTrigger>
            <TabsTrigger value="notes">Notes</TabsTrigger>
          </TabsList>

          <TabsContent value="development" className="space-y-4 pt-4">
            {athleteId && <CoachDevelopmentTab athleteId={athleteId} />}
          </TabsContent>

          <TabsContent value="trends" className="space-y-4 pt-4">
            {athleteId && <CoachTrendsTab athleteId={athleteId} />}
          </TabsContent>

          <TabsContent value="readiness" className="space-y-4 pt-4">
            {athleteId && <CoachReadinessTab athleteId={athleteId} />}
          </TabsContent>

          <TabsContent value="games" className="space-y-4 pt-4">
            {athleteId && <CoachGamesTab athleteId={athleteId} canVerify={user?.id !== athleteId} />}
          </TabsContent>

          <TabsContent value="reports" className="space-y-4 pt-4">
            {athleteId && <CoachReportsTab athleteId={athleteId} />}
          </TabsContent>

          <TabsContent value="grades" className="space-y-4 pt-4">
            {athleteId && <CoachGradesTab athleteId={athleteId} sport={hittingDoctrineSnap?.sport ?? null} />}
          </TabsContent>

          <TabsContent value="recap" className="space-y-4 pt-4">
            {athleteId && <CoachRecapTab athleteId={athleteId} />}
          </TabsContent>

          <TabsContent value="load" className="space-y-4 pt-4">
            {athleteId && <CoachLoadTab athleteId={athleteId} />}
          </TabsContent>

          <TabsContent value="tests" className="space-y-4 pt-4">
            {athleteId && <CoachTestsTab athleteId={athleteId} />}
          </TabsContent>

          <TabsContent value="notes" className="space-y-4 pt-4">
            {athleteId && user?.id !== athleteId && <CoachPrivateNotes athleteId={athleteId} />}
          </TabsContent>

          <TabsContent value="overview" className="space-y-4 pt-4">
            {athleteId && (
              <CoachAthleteSummary
                athleteId={athleteId}
                lastActivityAt={rows[0]?.occurred_at ?? null}
              />
            )}

            {snap && (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3" data-tour="coach-work">
                {(["readiness", "fatigue", "workload"] as const).map((k) => {
                  const p = snap[k];
                  return (
                    <Card key={k}>
                      <CardHeader className="pb-2"><CardTitle className="capitalize text-base">{k}</CardTitle></CardHeader>
                      <CardContent className="space-y-2">
                        <div className="flex flex-wrap items-center gap-1">
                          <ConfidencePill confidence={p.confidence} />
                          <MissingnessChip missingness={p.missingness} />
                        </div>
                        <code className="block truncate text-[11px] text-muted-foreground">{p.topicId ?? "—"}</code>
                        <p className="font-mono text-[10px] text-muted-foreground">{p.occurredAt ?? "—"}</p>
                        <ReplayDrilldownCTA eventId={p.sourceEventId} />
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            {/* RR-9 / RR-10 — recruiting surfaces gated by athlete-owned consent + minor protection.
                Authority lives in `athlete_recruiting_consent`; this surface only projects. */}
            {athleteId && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between text-base">
                    <span>Recruiting snapshot</span>
                    <Badge variant="outline" className="text-[10px]">RR-9 athlete-controlled</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <RecruitingVisibilityGate
                    athleteId={athleteId}
                    scope="metrics"
                    fallback={
                      <p className="text-xs text-muted-foreground">
                        Hidden. Visibility is controlled by the athlete (and parent, for minors)
                        per RR-9 / RR-10. Recruiting intelligence is unavailable until the athlete
                        enables visibility in their privacy settings.
                      </p>
                    }
                  >
                    <div className="space-y-3">
                      {pieV2Latest && (
                        <PieV2RecruitingCard
                          aggregate={pieV2Latest}
                          trajectories={pieV2Trajectories}
                          optIn
                        />
                      )}
                      <HittingRecruitingCard
                        doctrine={(hittingDoctrineSnap?.hitting_doctrine as any) ?? null}
                      />
                    </div>
                  </RecruitingVisibilityGate>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="training" className="space-y-4 pt-4">
            {/* Plan v3.1 Phase 5 — coach workout assignment, safety-checked against
                the player's age, sport and equipment before it can be sent. */}
            {athleteId && user?.id !== athleteId && rosterAccess === true && <CoachDrillAssign />}

            {/* Phase 49: UhrcReportCard, PieV2 hammer-brief, HammerReportCardAggregate, and ReportCardTrendStrip removed (composite/aggregate scores not measurement-backed). PieV2CoachPanel retained (coach-only diagnostic, not athlete-facing). */}
            {athleteId && <PieV2CoachPanel athleteId={athleteId} />}

            {/* Hitting doctrine (P1-P4) — same JSON as athlete surface */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Hitting doctrine (P1-P4)</CardTitle>
              </CardHeader>
              <CardContent>
                <HittingDoctrineBlock
                  doctrine={(hittingDoctrineSnap?.hitting_doctrine as any) ?? null}
                  title="Athlete's hitting focus"
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="messages" className="space-y-4 pt-4">
            {athleteId && user?.id !== athleteId && rosterAccess === true && <CoachMessageBox athleteId={athleteId} />}
          </TabsContent>

          <TabsContent value="activity" className="space-y-4 pt-4">
            <Card data-tour="coach-stream">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  Canonical event stream
                  <Badge variant="outline" className="ml-auto">{rows.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="h-32 animate-pulse rounded-md bg-muted/40" />
                ) : rows.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No canonical events in the last 30 days.</p>
                ) : (
                  <ul className="divide-y">
                    {rows.map((r) => (
                      <li key={r.event_id} className="flex items-center gap-2 py-2 text-sm">
                        <code className="flex-1 truncate rounded bg-muted px-1 text-[11px]">{r.topic_id}</code>
                        <span className="hidden font-mono text-[10px] text-muted-foreground sm:inline">{r.occurred_at}</span>
                        <ReplayDrilldownCTA eventId={r.event_id} label="" />
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
