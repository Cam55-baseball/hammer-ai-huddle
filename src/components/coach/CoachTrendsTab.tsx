import { MeaningTitle } from "@/components/progress/SectionMeaning";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  baselineLine,
  latestVsBaseline,
  metricName,
  observationLine,
  trendLabel,
  type TrendRow,
} from "@/lib/coach/trends";

const fmt = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });

export function CoachTrendsTab({ athleteId }: { athleteId: string }) {
  const { data = [], isLoading, isError } = useQuery({
    queryKey: ["coach-athlete-trends", athleteId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("coach_athlete_trends", { _athlete: athleteId });
      if (error) throw error;
      return (data ?? []) as unknown as TrendRow[];
    },
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading trends…</p>;
  if (isError) return <p className="text-sm text-muted-foreground">Trends are not available.</p>;
  if (data.length === 0)
    return (
      <p className="text-sm text-muted-foreground" data-testid="coach-trends-empty">
        No measurements yet — trends appear once the player has measured results.
      </p>
    );

  return (
    <div className="space-y-3" data-testid="coach-trends">
      <h3><MeaningTitle title="Measured Trends" use="Look for a result outside the player's usual range. If it's lower, check sleep, soreness and workload before changing the plan.">Each measured result is compared only with this player's own usual range — never with other players.</MeaningTitle></h3>
      {data.map((r) => {
        const recent = (r.recent ?? []).slice(0, 5);
        const verdict = latestVsBaseline(r);
        return (
          <Card key={r.metric_key}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm capitalize">{metricName(r.metric_key)}</CardTitle>
              <p className="text-xs text-muted-foreground">{baselineLine(r)}</p>
              <p className="text-xs text-muted-foreground">{trendLabel(r.trend)}</p>
              {verdict && <p className="text-xs font-medium">{verdict}</p>}
            </CardHeader>
            <CardContent className="divide-y text-sm">
              {recent.length === 0 ? (
                <p className="text-muted-foreground">No recent measurements.</p>
              ) : (
                recent.map((o, i) => (
                  <div key={`${o.recorded_at}-${i}`} className="flex justify-between py-1">
                    <span className="text-muted-foreground">Measured result</span>
                    <span className="font-medium">{observationLine(o, fmt)}</span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
