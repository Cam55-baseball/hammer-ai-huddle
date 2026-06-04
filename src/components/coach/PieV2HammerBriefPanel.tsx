/**
 * PIE V2 — AI Hammer brief panel.
 *
 * Renders deterministic talking points produced by
 * `talkingPointsForSession`. The HammerBrief slot order is fixed by HUAC
 * (Wave B) and pre-anticipated here in its simplest form: per-signal
 * observation → root-cause hint → next step. No free-form prose, no
 * fabricated certainty, RR-5 compliant.
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { talkingPointsForSession } from "@/lib/pieV2/aiHammerTalkingPoints";
import { PIE_V2_SIGNALS } from "@/data/baseball/pieV2Signals";
import type { PieV2SessionAggregate } from "@/lib/pieV2/types";

interface Props {
  aggregate: PieV2SessionAggregate;
}

export function PieV2HammerBriefPanel({ aggregate }: Props) {
  const points = talkingPointsForSession(
    aggregate.signals.map((s) => ({
      signal_id: s.signal_id,
      tier: s.tier,
      tracked_only: s.tracked_only,
    })),
  );
  if (points.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">AI Hammer brief</CardTitle></CardHeader>
        <CardContent className="text-xs text-muted-foreground">
          No leaks detected this session. Hold the pattern.
        </CardContent>
      </Card>
    );
  }
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center justify-between">
          <span>AI Hammer brief</span>
          <Badge variant="outline">{points.length} priorities</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {points.map((p) => {
          const def = PIE_V2_SIGNALS[p.signal_id];
          return (
            <div key={p.signal_id} className="rounded border p-2 text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-medium">{def.label}</span>
                <Badge variant={p.tier === "critical" ? "destructive" : p.tier === "major" ? "default" : "outline"}>
                  {p.tier}
                </Badge>
              </div>
              <div><span className="text-muted-foreground">Observation:</span> {p.observation}</div>
              <div><span className="text-muted-foreground">Cause:</span> {p.root_cause_hint}</div>
              <div><span className="text-muted-foreground">Next:</span> {p.next_step}</div>
            </div>
          );
        })}
        <div className="text-[10px] text-muted-foreground border-t pt-1">
          engine_version {aggregate.engine_version} · RR-5 deterministic envelope
        </div>
      </CardContent>
    </Card>
  );
}
