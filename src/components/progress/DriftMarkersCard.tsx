/**
 * DriftMarkersCard — surfaces week-over-week GP signal deltas on The
 * General as advisory "drift markers". Interpretive overlay only: each
 * delta is derived purely from the gp_* ledger (current 7d vs prior 7d).
 *
 * Replay-safe. Never authors organism truth. If nothing has shifted, or
 * the prior window is too thin to compare, the card stays out of the way.
 */
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useRoadmapDeltas } from "@/hooks/useRoadmapDeltas";
import type { RoadmapDelta, RoadmapDeltaKind } from "@/lib/gp/roadmapDeltas";

function iconFor(kind: RoadmapDeltaKind) {
  switch (kind) {
    case "new_weakness":
      return <TrendingUp className="h-4 w-4 text-destructive" aria-hidden />;
    case "cluster_emerged":
      return <AlertTriangle className="h-4 w-4 text-destructive" aria-hidden />;
    case "improvement":
      return <TrendingDown className="h-4 w-4 text-emerald-500" aria-hidden />;
    case "cluster_cleared":
      return <CheckCircle2 className="h-4 w-4 text-emerald-500" aria-hidden />;
  }
}

function toneFor(kind: RoadmapDeltaKind): "destructive" | "secondary" {
  return kind === "new_weakness" || kind === "cluster_emerged"
    ? "destructive"
    : "secondary";
}

function DeltaRow({ d }: { d: RoadmapDelta }) {
  return (
    <div className="flex items-start gap-3 rounded-md border border-border/40 bg-card/40 p-3">
      <div className="mt-0.5">{iconFor(d.kind)}</div>
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold">{d.label}</span>
          <Badge variant={toneFor(d.kind)} className="text-[10px] capitalize">
            {d.kind.replace("_", " ")}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">{d.detail}</p>
        {d.cta && (
          <Button asChild size="sm" variant="outline" className="h-7 px-2 text-xs mt-1">
            <Link to={d.cta.href}>{d.cta.label}</Link>
          </Button>
        )}
      </div>
    </div>
  );
}

export function DriftMarkersCard() {
  const { loading, deltas } = useRoadmapDeltas();

  if (loading) return null;
  if (deltas.length === 0) return null;

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          Drift markers
          <Badge variant="outline" className="text-[10px] font-normal">
            week-over-week
          </Badge>
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Shifts in your last 7 days vs the prior 7 days, drawn from your game
          log. Advisory only — your reported pain and parent settings always win.
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        {deltas.map((d, i) => (
          <DeltaRow key={`${d.metric}-${d.kind}-${i}`} d={d} />
        ))}
      </CardContent>
    </Card>
  );
}

export default DriftMarkersCard;
