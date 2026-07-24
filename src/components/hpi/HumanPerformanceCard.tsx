import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, ChevronDown } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useSeasonStatus } from "@/hooks/useSeasonStatus";
import { readHpiLifestyle } from "@/lib/hpi/lifestyleStore";
import { computeHpiSignal } from "@/lib/hpi/hpiSignal";
import { BreathPrimer } from "./BreathPrimer";
import { useOpenedOnceToday } from "@/hooks/useOpenedOnceToday";
import { useState } from "react";

/**
 * Human Performance Intelligence card — Neijing-inspired overlay.
 * Interpretive-only; never authors organism truth. Starts closed and glows
 * with a soft primary-tinted pulse until the athlete opens it once today.
 * Today's Wisdom now lives in its own card above this one.
 */
export function HumanPerformanceCard() {
  const { resolvedPhase, phaseProfile, isLoading } = useSeasonStatus();
  const lifestyle = useMemo(() => readHpiLifestyle(), []);
  const signal = useMemo(
    () => computeHpiSignal(resolvedPhase, lifestyle),
    [resolvedPhase, lifestyle],
  );
  const [open, setOpen] = useState(false);
  const { shouldGlow, markOpened } = useOpenedOnceToday("hpi");

  const bandColor: Record<typeof signal.band, string> = {
    peak: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
    sharp: "bg-primary/15 text-primary border-primary/30",
    steady: "bg-amber-500/10 text-amber-500 border-amber-500/30",
    restore: "bg-rose-500/10 text-rose-500 border-rose-500/30",
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) markOpened();
  };

  return (
    <Card
      className={`border-border/60 transition-shadow ${
        shouldGlow ? "ring-2 ring-primary/50 animate-hammer-today-glow" : ""
      }`}
    >
      <Collapsible open={open} onOpenChange={handleOpenChange}>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="w-full text-left"
            aria-expanded={open}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Activity className="h-4 w-4 text-primary" />
                    Human Performance Intelligence
                    {shouldGlow && (
                      <Badge
                        variant="outline"
                        className="text-[10px] border-primary/50 text-primary uppercase tracking-wide"
                      >
                        New today
                      </Badge>
                    )}
                  </CardTitle>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {phaseProfile.label} · {signal.element} · {signal.yinYangEmphasis}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="flex flex-col items-end gap-1">
                    <div className="text-2xl font-semibold tabular-nums text-foreground">
                      {isLoading ? "—" : signal.score}
                    </div>
                    <Badge variant="outline" className={`text-[10px] uppercase ${bandColor[signal.band]}`}>
                      {signal.band}
                    </Badge>
                  </div>
                  <ChevronDown
                    className={`h-5 w-5 text-muted-foreground transition-transform ${
                      open ? "rotate-180" : ""
                    }`}
                  />
                </div>
              </div>
            </CardHeader>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-3 pt-0">
            <p className="text-sm text-foreground/90">{signal.narrative}</p>
            <p className="text-xs text-muted-foreground">
              Today starts here. Use this breath primer before warm-up, at-bats, or pitches. The recovery card at the end of the day has its own down-regulation breath — this one is for activation.
            </p>
            <BreathPrimer primer={signal.breathPrimer} scheduleLabel="Now — pre-activity primer" />
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
