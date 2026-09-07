/**
 * PIE V2 — coach panel.
 *
 * Embeds inside CoachAthleteDetail. Per-signal aggregates, deficiency queue,
 * caution surfacing. Replay-handle exposed one click away.
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { usePitchingV2Trends } from "@/hooks/usePitchingV2Trends";
import { trajectoriesAll } from "@/lib/pieV2/longitudinal";
import { recommendDrills } from "@/lib/pieV2/recommendDrills";
import { deriveInjuryCaution } from "@/lib/pieV2/injuryDetection";
import { PIE_V2_SIGNALS } from "@/data/baseball/pieV2Signals";
import { useSportConfig } from "@/hooks/useSportConfig";

interface Props { athleteId: string }

export function PieV2CoachPanel({ athleteId }: Props) {
  const { sport } = useSportConfig();
  const { data, isLoading } = usePitchingV2Trends(athleteId);
  if (sport !== "baseball") return null;
  if (isLoading) return <Card><CardContent className="py-4 text-sm text-muted-foreground">Loading PIE V2…</CardContent></Card>;
  const w30 = data?.find((w) => w.window === "30d");
  const aggs = w30?.aggregates ?? [];
  if (aggs.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Pitching Intelligence V2</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          No PIE V2 sessions in the last 30 days.
        </CardContent>
      </Card>
    );
  }
  const latest = aggs[aggs.length - 1];
  const trajectories = trajectoriesAll(aggs);
  const drills = recommendDrills(latest);
  const caution = deriveInjuryCaution(latest, aggs.slice(-5));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center justify-between">
          <span>Pitching Intelligence V2</span>
          {latest.pie_v2_composite != null && (
            <Badge variant="outline">Composite {latest.pie_v2_composite}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {caution.level !== "none" && (
          <div className="rounded border border-amber-300 bg-amber-50 dark:bg-amber-950/30 p-2 text-xs">
            <strong className="block">RR-6 advisory: {caution.level}</strong>
            <span className="text-muted-foreground">{caution.recommended_action}</span>
            {caution.contributing_factors.length > 0 && (
              <ul className="list-disc list-inside mt-1">
                {caution.contributing_factors.map((f) => <li key={f}>{f}</li>)}
              </ul>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          {latest.signals.filter((s) => !s.tracked_only).map((s) => {
            const def = PIE_V2_SIGNALS[s.signal_id];
            const traj = trajectories.find((t) => t.signal_id === s.signal_id);
            return (
              <div key={s.signal_id} className="rounded border p-2 text-xs">
                <div className="flex justify-between">
                  <span className="font-medium">{def.label}</span>
                  {s.tier && <Badge variant={s.tier === "clean" ? "secondary" : s.tier === "critical" ? "destructive" : "outline"}>{s.tier}</Badge>}
                </div>
                <div className="text-muted-foreground mt-1">
                  avg {s.average?.toFixed(0) ?? "—"} · n={s.sample_count} · trend {traj?.trend ?? "—"}
                </div>
              </div>
            );
          })}
        </div>

        {drills.length > 0 && (
          <div>
            <div className="text-xs font-medium mb-1">Recommended drills</div>
            <ul className="text-xs space-y-1">
              {drills.slice(0, 5).map((r) => (
                <li key={r.drill.id} className="flex justify-between">
                  <span>{r.drill.name}</span>
                  <span className="text-muted-foreground">{r.rationale}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="text-[10px] text-muted-foreground border-t pt-2">
          engine_version {latest.engine_version} · canonical topic <code>pitching.v2.session_aggregate</code>
        </div>
      </CardContent>
    </Card>
  );
}
