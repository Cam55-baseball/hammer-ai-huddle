/**
 * SideDifferentialCard — surfaces L vs R asymmetry when both sides have
 * enough samples (MIN_PER_SIDE). Below threshold, renders nothing —
 * trust-first, never invents data.
 *
 * Consumed by The General + Hammer "Ask" surfaces. Pure render
 * over `computeSideDifferential`.
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Scale } from "lucide-react";
import {
  computeSideDifferential,
  type SidedPoint,
  MIN_PER_SIDE,
} from "@/lib/side/sideDifferential";

interface Props {
  metricLabel: string;
  unit?: string;
  points: ReadonlyArray<SidedPoint>;
  higherIsBetter?: boolean;
  /** When true, render an explicit "not enough data" hint instead of null. */
  showEmpty?: boolean;
}

export function SideDifferentialCard({
  metricLabel,
  unit,
  points,
  higherIsBetter = true,
  showEmpty = false,
}: Props) {
  const result = computeSideDifferential(points, {
    higherIsBetter,
    metricLabel,
  });

  if (!result) {
    if (!showEmpty) return null;
    return (
      <Card className="border-dashed">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Scale className="h-4 w-4 text-muted-foreground" />
            {metricLabel} · L/R differential
          </CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground">
          Need ≥ {MIN_PER_SIDE} samples on each side to compute a trusted
          differential. Keep logging both sides.
        </CardContent>
      </Card>
    );
  }

  const fmt = (n: number) =>
    Math.abs(n) >= 100 ? n.toFixed(0) : n.toFixed(2);
  const pct = (Math.abs(result.diffPct) * 100).toFixed(0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between gap-2 text-sm">
          <span className="inline-flex items-center gap-2">
            <Scale className="h-4 w-4 text-primary" />
            {metricLabel} · L/R differential
          </span>
          <Badge
            variant={result.favored === "even" ? "outline" : "default"}
            className="text-[10px]"
          >
            {result.favored === "even" ? "Even" : `${result.favored} +${pct}%`}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-xs">
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-md border border-border bg-muted/30 p-2">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
              Left (n={result.leftN})
            </div>
            <div className="text-sm font-semibold">
              {fmt(result.leftMean)}
              {unit && <span className="ml-1 text-[10px] text-muted-foreground">{unit}</span>}
            </div>
          </div>
          <div className="rounded-md border border-border bg-muted/30 p-2">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
              Right (n={result.rightN})
            </div>
            <div className="text-sm font-semibold">
              {fmt(result.rightMean)}
              {unit && <span className="ml-1 text-[10px] text-muted-foreground">{unit}</span>}
            </div>
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground">{result.reading}</p>
        <p className="text-[10px] text-muted-foreground/80">
          Window: {result.windowStart} → {result.windowEnd}
        </p>
      </CardContent>
    </Card>
  );
}
