import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { RatingAgreement } from "@/components/ratings/RatingAgreement";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  parseReportsPayload,
  moduleLabel,
  reportDateLabel,
  reportScoreLabel,
  gradeSourceLabel,
  gradeLine,
  recapLines,
} from "@/lib/coach/reports";

function useCoachReports(athleteId: string) {
  return useQuery({
    queryKey: ["coach-athlete-reports", athleteId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("coach_athlete_reports", {
        _athlete: athleteId,
      });
      if (error) throw error;
      return parseReportsPayload(data);
    },
  });
}

function State({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}

export function CoachReportsTab({ athleteId }: { athleteId: string }) {
  const { data, isLoading, error } = useCoachReports(athleteId);
  if (isLoading) return <State>Loading reports…</State>;
  if (error) return <State>Could not load reports.</State>;
  const reports = data?.reports ?? [];
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Video analysis reports</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {reports.length === 0 ? (
          <State>No analysis reports yet.</State>
        ) : (
          reports.map((r) => (
            <div key={r.id} className="rounded-md border p-3 text-sm">
              <div className="font-medium">{r.title ?? moduleLabel(r.module)}</div>
              <div className="text-muted-foreground">
                {moduleLabel(r.module)} · {reportDateLabel(r)}
              </div>
              <div className="text-muted-foreground">{reportScoreLabel(r)}</div>
              <div className="text-xs text-muted-foreground">Source: video analysis</div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

export function CoachGradesTab({ athleteId, sport = null }: { athleteId: string; sport?: string | null }) {
  const { data, isLoading, error } = useCoachReports(athleteId);
  if (isLoading) return <State>Loading grades…</State>;
  if (error) return <State>Could not load grades.</State>;
  const grades = data?.grades ?? [];
  const sportQ = useQuery({
    queryKey: ["coach-athlete-sport", athleteId], enabled: !sport,
    queryFn: async () => ((await supabase.from("athlete_mpi_settings").select("sport").eq("user_id", athleteId).maybeSingle()).data as any)?.sport ?? null,
  });
  const athleteSport = sport ?? sportQ.data ?? null;
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Grades</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {grades.length === 0 ? (
          <State>No grades yet.</State>
        ) : (
          grades.map((g) => (
            <div key={g.id} className="rounded-md border p-3 text-sm">
              <div className="font-medium">{gradeLine(g)}</div>
              <div className="text-muted-foreground">
                {g.graded_at ? `Graded: ${String(g.graded_at).slice(0, 10)}` : "No date"}
              </div>
              <div className="text-xs text-muted-foreground">{gradeSourceLabel(g.grade_source)}</div>
              {g.player_confirmed === false && (
                <div className="text-xs text-muted-foreground">Not confirmed by the player yet</div>
              )}
              {g.overall_grade != null && (
                <RatingAgreement athleteId={athleteId} sport={athleteSport} position={g.position_evaluated}
                  testKey={g.grade_type ?? "grade"} metricKey="overall_grade" grade={g.overall_grade} />
              )}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

export function CoachRecapTab({ athleteId }: { athleteId: string }) {
  const { data, isLoading, error } = useCoachReports(athleteId);
  if (isLoading) return <State>Loading recap…</State>;
  if (error) return <State>Could not load the recap.</State>;
  const recap = data?.recap ?? null;
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Six-week recap</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {!recap ? (
          <State>No recap yet. Recaps are created after six weeks of training.</State>
        ) : (
          <>
            {recapLines(recap).map((line) => (
              <div key={line}>{line}</div>
            ))}
            <div className="text-xs text-muted-foreground">
              Source: the player's own training logs
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
