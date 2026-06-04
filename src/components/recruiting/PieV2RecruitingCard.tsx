/**
 * PIE V2 — recruiting card.
 *
 * Opt-in only. Subordinate to RR-9 visibility ethics. Shows aggregate tier
 * per signal, trajectory arrow, confidence band, missingness state.
 * No raw rep data, no unfiltered pain correlation, no minor-athlete
 * escalation. Caller must enforce the RR-9 opt-in gate before rendering.
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowUp, ArrowDown, Minus } from "lucide-react";
import type { PieV2SessionAggregate } from "@/lib/pieV2/types";
import type { PieV2Trajectory } from "@/lib/pieV2/longitudinal";
import { PIE_V2_SIGNALS } from "@/data/baseball/pieV2Signals";

interface Props {
  aggregate: PieV2SessionAggregate;
  trajectories: PieV2Trajectory[];
  optIn: boolean; // RR-9 gate
}

export function PieV2RecruitingCard({ aggregate, trajectories, optIn }: Props) {
  if (!optIn) return null;
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Mechanics Snapshot (PIE V2)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="text-xs text-muted-foreground">
          Aggregate signals · confidence and missingness preserved per Eternal Laws.
        </div>
        <div className="grid grid-cols-2 gap-2">
          {aggregate.signals.filter((s) => !s.tracked_only).map((s) => {
            const traj = trajectories.find((t) => t.signal_id === s.signal_id);
            const def = PIE_V2_SIGNALS[s.signal_id];
            return (
              <div key={s.signal_id} className="rounded border p-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{def.label}</span>
                  <span className="flex items-center gap-1">
                    {s.tier && <Badge variant="outline">{s.tier}</Badge>}
                    {traj?.trend === "improving" && <ArrowUp className="h-3 w-3 text-emerald-600" />}
                    {traj?.trend === "regressing" && <ArrowDown className="h-3 w-3 text-rose-600" />}
                    {traj?.trend === "stable" && <Minus className="h-3 w-3 text-muted-foreground" />}
                  </span>
                </div>
                <div className="text-[10px] text-muted-foreground">
                  conf {s.confidence.score} · missing {s.missing_count}
                </div>
              </div>
            );
          })}
        </div>
        <div className="text-[10px] text-muted-foreground">
          engine_version {aggregate.engine_version}
        </div>
      </CardContent>
    </Card>
  );
}
