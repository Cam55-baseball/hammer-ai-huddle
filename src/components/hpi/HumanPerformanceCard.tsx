import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, Sparkles } from "lucide-react";
import { useSeasonStatus } from "@/hooks/useSeasonStatus";
import { readHpiLifestyle } from "@/lib/hpi/lifestyleStore";
import { computeHpiSignal } from "@/lib/hpi/hpiSignal";
import { pickTodaysTip } from "@/lib/hpi/seasonalTips";
import { BreathPrimer } from "./BreathPrimer";

/**
 * Human Performance Intelligence card — Neijing-inspired overlay.
 * Interpretive-only; never authors organism truth. Lifestyle intake now
 * flows in through the Quick Check-In and Coach Hammer Next Best Step
 * surfaces — this card stays lean (score, narrative, primer, wisdom).
 */
export function HumanPerformanceCard() {
  const { resolvedPhase, phaseProfile, isLoading } = useSeasonStatus();
  const lifestyle = useMemo(() => readHpiLifestyle(), []);
  const signal = useMemo(
    () => computeHpiSignal(resolvedPhase, lifestyle),
    [resolvedPhase, lifestyle],
  );
  const tip = useMemo(() => pickTodaysTip(resolvedPhase), [resolvedPhase]);

  const bandColor: Record<typeof signal.band, string> = {
    peak: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
    sharp: "bg-primary/15 text-primary border-primary/30",
    steady: "bg-amber-500/10 text-amber-500 border-amber-500/30",
    restore: "bg-rose-500/10 text-rose-500 border-rose-500/30",
  };

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-4 w-4 text-primary" />
              Human Performance Intelligence
            </CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              {phaseProfile.label} · {signal.element} · {signal.yinYangEmphasis}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <div className="text-2xl font-semibold tabular-nums text-foreground">
              {isLoading ? "—" : signal.score}
            </div>
            <Badge variant="outline" className={`text-[10px] uppercase ${bandColor[signal.band]}`}>
              {signal.band}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-foreground/90">{signal.narrative}</p>

        <p className="text-xs text-muted-foreground">
          Today starts here. Use this breath primer before warm-up, at-bats, or pitches. The recovery card at the end of the day has its own down-regulation breath — this one is for activation.
        </p>
        <BreathPrimer primer={signal.breathPrimer} scheduleLabel="Now — pre-activity primer" />

        <div className="rounded-md border border-border bg-muted/20 p-3">
          <div className="flex items-center gap-2 text-xs font-medium">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Today's wisdom · {tip.category}
          </div>
          <div className="mt-1 text-sm font-medium text-foreground">{tip.title}</div>
          <p className="mt-0.5 text-xs text-muted-foreground">{tip.body}</p>
        </div>
      </CardContent>
    </Card>
  );
}
