import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowUpRight, AlertTriangle, ShieldCheck, Users, CircleSlash } from "lucide-react";
import { useCoachDigestProjection } from "@/hooks/digest/useCoachDigestProjection";
import { OrganismChangeCard } from "@/components/digest/OrganismChangeCard";
import { WorkloadShiftCard } from "@/components/digest/WorkloadShiftCard";
import { EscalationResolutionCard } from "@/components/digest/EscalationResolutionCard";
import { DigestEmptyState } from "@/components/digest/DigestEmptyState";

export default function CoachDigest() {
  const { user, loading, isAuthStable } = useAuth();
  const navigate = useNavigate();
  const { projection, roster, isLoading } = useCoachDigestProjection();

  useEffect(() => {
    if (!loading && isAuthStable && !user) navigate("/auth", { replace: true });
  }, [loading, isAuthStable, user, navigate]);

  return (
    <DashboardLayout>
      <div className="mx-auto w-full max-w-6xl px-4 pb-12 sm:px-6">
        <header className="flex items-start justify-between gap-4 border-b pb-4 pt-4">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
              <Users className="h-6 w-6 text-primary" />
              Organization Digest
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Deterministic roster-wide organism change. Lineage-cited. No rankings.
            </p>
          </div>
          <div className="text-right font-mono text-xs text-muted-foreground">
            {projection.totalAthletes} athlete{projection.totalAthletes === 1 ? "" : "s"}
          </div>
        </header>

        {isLoading ? (
          <div className="mt-6 h-32 animate-pulse rounded-md bg-muted/40" />
        ) : roster.length === 0 ? (
          <div className="mt-6">
            <DigestEmptyState message="No roster yet." />
          </div>
        ) : (
          <div className="mt-6 space-y-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              <OrganismChangeCard projection={projection.orgEventDensity} />
              <WorkloadShiftCard projection={projection.orgWorkloadShift} />
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <CircleSlash className="h-4 w-4 text-muted-foreground" />
                    Stale signals
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-sm">
                    {projection.staleAthletes} of {projection.totalAthletes} athletes have at
                    least one tracked topic with no events this week.
                  </p>
                  {projection.staleAthletes > 0 && (
                    <div className="space-y-1">
                      {Array.from(projection.missingByAthlete.entries())
                        .slice(0, 8)
                        .map(([athleteId, topics]) => {
                          const profile = roster.find((a) => a.athleteId === athleteId);
                          return (
                            <Link
                              key={athleteId}
                              to={`/coach/athlete/${athleteId}`}
                              className="flex items-center justify-between rounded border bg-background px-2 py-1 text-xs hover:border-primary"
                            >
                              <span className="truncate">{profile?.displayName ?? "Athlete"}</span>
                              <span className="font-mono text-muted-foreground">
                                {topics.length} missing
                              </span>
                            </Link>
                          );
                        })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <EscalationResolutionCard
              emerged={projection.orgEscalationEmerged}
              resolved={projection.orgEscalationResolved}
            />

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  Unresolved escalations (last 7d)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {projection.unresolved.length === 0 ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <ShieldCheck className="h-4 w-4" /> No unresolved escalations this week.
                  </div>
                ) : (
                  <ul className="divide-y">
                    {projection.unresolved.map((e) => (
                      <li
                        key={e.eventId}
                        className="flex flex-col gap-2 py-2 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{e.displayName}</p>
                          <p className="font-mono text-[10px] text-muted-foreground">
                            {e.topicId} · {e.occurredAt.slice(0, 16).replace("T", " ")}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          <Button asChild size="sm" variant="outline" className="text-xs">
                            <Link to={`/coach/athlete/${e.athleteId}`}>Open athlete</Link>
                          </Button>
                          <Button asChild size="sm" variant="ghost" className="text-xs">
                            <Link to={`/replay/${e.eventId}`}>
                              Open in replay
                              <ArrowUpRight className="ml-1 h-3 w-3" />
                            </Link>
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <p className="text-center text-[11px] text-muted-foreground">
              No comparative scoring. No rankings. No “top athletes.” Every row lineage-drillable.
            </p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
