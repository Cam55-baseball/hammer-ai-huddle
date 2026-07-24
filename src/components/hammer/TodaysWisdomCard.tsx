/**
 * TodaysWisdomCard — lean standalone card that renders the Neijing / Su Wen
 * inspired seasonal tip for today. Extracted out of HumanPerformanceCard so
 * it can sit at the top of the Hammers Today plan above HPI.
 *
 * Interpretive-only; never authors organism truth.
 */
import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles } from "lucide-react";
import { useSeasonStatus } from "@/hooks/useSeasonStatus";
import { pickTodaysTip } from "@/lib/hpi/seasonalTips";

export function TodaysWisdomCard() {
  const { resolvedPhase } = useSeasonStatus();
  const tip = useMemo(() => pickTodaysTip(resolvedPhase), [resolvedPhase]);

  return (
    <Card className="border-border/60">
      <CardContent className="p-3">
        <div className="flex items-center gap-2 text-xs font-medium">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          Today's Wisdom · {tip.category}
        </div>
        <div className="mt-1 text-sm font-semibold text-foreground">{tip.title}</div>
        <p className="mt-0.5 text-xs text-muted-foreground leading-snug">{tip.body}</p>
      </CardContent>
    </Card>
  );
}
