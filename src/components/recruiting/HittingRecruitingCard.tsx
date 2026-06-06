/**
 * Hitter recruiting surface — projection only, no new scoring/ranking.
 *
 * Reads canonical hitter intelligence already produced upstream
 * (`HittingDoctrineBlockData` + HIE missingness/confidence) and renders
 * the same RR-9-respecting shape as `PieV2RecruitingCard`.
 *
 * Caller MUST wrap this in `<RecruitingVisibilityGate athleteId={...}>` —
 * the card itself does not re-check consent.
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowUp, ArrowDown, Minus } from "lucide-react";
import type { HittingDoctrineBlockData } from "@/components/hitting/HittingDoctrineBlock";

interface Props {
  doctrine: HittingDoctrineBlockData | null | undefined;
}

function trendFor(confidence: number): "improving" | "regressing" | "stable" {
  if (confidence >= 0.7) return "improving";
  if (confidence <= 0.3) return "regressing";
  return "stable";
}

export function HittingRecruitingCard({ doctrine }: Props) {
  if (!doctrine || doctrine.confidence === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Hitting Snapshot</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-xs text-muted-foreground">
            No replay-valid hitter signals yet. Confidence and missingness preserved per Eternal Laws.
          </p>
        </CardContent>
      </Card>
    );
  }

  const trend = trendFor(doctrine.confidence);
  const phases = doctrine.violated_phases.slice(0, 4);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Hitting Snapshot</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="text-xs text-muted-foreground">
          Canonical hitter doctrine projection · confidence and missingness preserved.
        </div>
        <div className="grid grid-cols-2 gap-2">
          {phases.length === 0 ? (
            <div className="col-span-2 rounded border p-2 text-xs text-muted-foreground">
              No prioritized phases.
            </div>
          ) : (
            phases.map((phaseId) => (
              <div key={phaseId} className="rounded border p-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-medium capitalize">{phaseId.replace(/_/g, " ")}</span>
                  <span className="flex items-center gap-1">
                    {doctrine.priority_phase === phaseId && (
                      <Badge variant="outline">priority</Badge>
                    )}
                    {trend === "improving" && <ArrowUp className="h-3 w-3 text-emerald-600" />}
                    {trend === "regressing" && <ArrowDown className="h-3 w-3 text-rose-600" />}
                    {trend === "stable" && <Minus className="h-3 w-3 text-muted-foreground" />}
                  </span>
                </div>
                <div className="text-[10px] text-muted-foreground">
                  conf {doctrine.confidence.toFixed(2)} · missing {doctrine.missingness.missing_signals.length}
                </div>
              </div>
            ))
          )}
        </div>
        <div className="text-[10px] text-muted-foreground">
          engine_version {doctrine.engine_version}
        </div>
      </CardContent>
    </Card>
  );
}
