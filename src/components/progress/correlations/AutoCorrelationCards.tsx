/**
 * AutoCorrelationCards — surfaces deterministic correlations for a topic.
 * Shows nothing when sample size < MIN_SAMPLES. Never smooths.
 */
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { CorrelationResult } from "@/lib/progress/correlations";

export interface AutoCorrelation {
  readonly title: string;
  readonly xLabel: string;
  readonly yLabel: string;
  readonly result: CorrelationResult | null;
}

interface Props {
  readonly items: ReadonlyArray<AutoCorrelation>;
}

export function AutoCorrelationCards({ items }: Props) {
  const visible = items.filter((i) => i.result !== null);
  if (visible.length === 0) {
    return (
      <p className="text-xs text-muted-foreground italic">
        Not enough data yet to surface reliable correlations. Keep logging.
      </p>
    );
  }
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {visible.map((item, i) => {
        const r = item.result!;
        return (
          <Card key={i} className="border-primary/10">
            <CardContent className="p-3 space-y-1">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-xs font-semibold">{item.title}</h4>
                <Badge variant="outline" className="text-[10px]">
                  n={r.n}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">{r.reading}</p>
              <p className="text-[10px] text-muted-foreground">
                {r.windowStart} → {r.windowEnd} · {item.xLabel} vs {item.yLabel}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
