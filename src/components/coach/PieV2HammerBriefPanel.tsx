/**
 * PIE V2 — AI Hammer brief panel.
 *
 * As of the Intelligence Consumption Sprint, this panel now consumes
 * `generateHammerBrief` (canonical UHRC translator) in addition to the
 * existing per-signal talking-points (kept for back-compat / per-leak
 * detail). Hammer remains a translator, not an analyst — every field
 * carries lineage back to a source signal id.
 */
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { talkingPointsForSession } from "@/lib/pieV2/aiHammerTalkingPoints";
import { PIE_V2_SIGNALS } from "@/data/baseball/pieV2Signals";
import { trajectoriesAll } from "@/lib/pieV2/longitudinal";
import { recommendDrills } from "@/lib/pieV2/recommendDrills";
import { recommendVideos } from "@/lib/pieV2/recommendVideos";
import { buildUhrcReport } from "@/lib/uhrc/buildReport";
import { generateHammerBrief } from "@/lib/uhrc/generateHammerBrief";
import { useAuth } from "@/hooks/useAuth";
import { useEmitOnce, emitObservability } from "@/hooks/useEmitObservability";
import type { PieV2SessionAggregate } from "@/lib/pieV2/types";


interface Props {
  aggregate: PieV2SessionAggregate;
}

export function PieV2HammerBriefPanel({ aggregate }: Props) {
  const { user } = useAuth();
  const [acked, setAcked] = useState(false);
  const isSelf = user?.id && aggregate.athlete_id === user.id;
  // RFL-004 — emit canonical intelligence.hammer.viewed once per
  // (actor, athlete) per day. Surface-level mount fires after the brief is computed.
  useEmitOnce(
    user?.id
      ? `hammer:${user.id}:${aggregate.athlete_id}`
      : null,
    user?.id
      ? {
          topic: "intelligence.hammer.viewed",
          athleteId: aggregate.athlete_id,
          actorId: user.id,
          actorRole: isSelf ? "athlete" : "coach",
          payload: {
            surface: "pie_v2_hammer_brief",
            engine_version: aggregate.engine_version,
          },
        }
      : null,
  );


  const uhrc = buildUhrcReport({
    athlete_id: aggregate.athlete_id,
    disciplines: ["pitching"],
    pieV2Latest: aggregate,
  });
  const trends = trajectoriesAll([aggregate]).map((t) => ({
    source_signal_id: t.signal_id,
    trend: t.trend,
    slope: t.slope_30d,
  }));
  const drills = recommendDrills(aggregate);
  const videos = recommendVideos(aggregate);
  const brief = generateHammerBrief({
    uhrc,
    recommendations: {
      drill: drills[0]
        ? { id: drills[0].drill.id, name: drills[0].drill.name, rationale: drills[0].rationale, source_signal_id: drills[0].drill.signal_id }
        : null,
      video: videos[0]
        ? { id: videos[0].video.id, title: videos[0].video.title, rationale: videos[0].rationale, source_signal_id: videos[0].video.signal_id }
        : null,
    },
    trends,
  });

  // Per-signal leak detail (existing behavior).
  const points = talkingPointsForSession(
    aggregate.signals.map((s) => ({
      signal_id: s.signal_id,
      tier: s.tier,
      tracked_only: s.tracked_only,
    })),
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center justify-between">
          <span>AI Hammer brief</span>
          <Badge variant="outline">{points.length} priorities</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Canonical UHRC-derived envelope */}
        <div className="rounded border p-3 text-xs space-y-1 bg-muted/30">
          <div><span className="text-muted-foreground">Biggest win:</span> {brief.biggest_win.headline}</div>
          <div><span className="text-muted-foreground">Biggest leak:</span> {brief.biggest_leak.headline}</div>
          <div><span className="text-muted-foreground">Priority fix:</span> {brief.priority_fix.headline}</div>
          <div><span className="text-muted-foreground">Why it matters:</span> {brief.why_it_matters.text}</div>
          {brief.drill && (
            <div><span className="text-muted-foreground">Drill:</span> {brief.drill.name} — {brief.drill.rationale}</div>
          )}
          {brief.video && (
            <div><span className="text-muted-foreground">Video:</span> {brief.video.title} — {brief.video.rationale}</div>
          )}
          <div><span className="text-muted-foreground">Trend:</span> {brief.trend.direction} <code className="text-[10px]">({brief.trend.source_signal_id})</code></div>
          <div className="pt-1 text-[10px] text-muted-foreground border-t">
            {brief.evidence.length} evidence anchors · engine {brief.engine_version}
          </div>
        </div>

        {/* Per-leak detail */}
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
        {/* RFL-010 — explicit coach acknowledgement. Intentional action only, never page-render. */}
        {!isSelf && user?.id && (
          <div className="flex items-center justify-between border-t pt-2">
            <span className="text-[10px] text-muted-foreground">
              Acknowledge after reviewing this brief.
            </span>
            <Button
              size="sm"
              variant={acked ? "secondary" : "default"}
              disabled={acked}
              onClick={() => {
                setAcked(true);
                void emitObservability({
                  topic: "foundation.recommendation.coach_ack",
                  athleteId: aggregate.athlete_id,
                  actorId: user.id,
                  actorRole: "coach",
                  lifetime: true,
                  payload: {
                    recommendation_kind: "hammer_brief",
                    recommendation_id: brief.priority_fix.source_signal_id ?? "hammer_brief",
                    coach_id: user.id,
                    engine_version: brief.engine_version,
                  },
                });
              }}
            >
              {acked ? "Acknowledged" : "Acknowledge brief"}
            </Button>
          </div>
        )}
        <div className="text-[10px] text-muted-foreground border-t pt-1">
          engine_version {aggregate.engine_version} · RR-5 deterministic envelope · UHRC {brief.engine_version}
        </div>
      </CardContent>
    </Card>
  );
}
