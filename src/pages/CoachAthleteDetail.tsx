import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfidencePill } from "@/components/command/ConfidencePill";
import { MissingnessChip } from "@/components/command/MissingnessChip";
import { ReplayDrilldownCTA } from "@/components/coach-console/ReplayDrilldownCTA";
import { snapshotAthlete } from "@/lib/coach/projections";
import type { AsbEventRow } from "@/hooks/useAsbTimeline";
import { ArrowLeft } from "lucide-react";

const COLS =
  "event_id, athlete_id, topic_id, actor_role, actor_id, occurred_at, ingested_at, effective_at, valid_from, valid_to, payload, engine_version, idempotency_key, causality_refs, lineage_refs";

export default function CoachAthleteDetail() {
  const { athleteId } = useParams<{ athleteId: string }>();

  const { data: rows = [], isLoading, error } = useQuery({
    queryKey: ["coach-athlete-rows", athleteId],
    enabled: !!athleteId,
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

  const snap = athleteId ? snapshotAthlete(athleteId, rows) : null;

  return (
    <DashboardLayout>
      <div className="space-y-6 p-4 md:p-6">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm">
            <Link to="/coach/console"><ArrowLeft className="mr-1 h-4 w-4" /> Back to roster</Link>
          </Button>
          <h1 className="text-xl font-bold">Athlete drilldown</h1>
          <code className="rounded bg-muted px-2 py-0.5 text-xs">{athleteId}</code>
        </div>

        {error && (
          <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
            {(error as Error).message}
          </div>
        )}

        {snap && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
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

        <Card>
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
      </div>
    </DashboardLayout>
  );
}
