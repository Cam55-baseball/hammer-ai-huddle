import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Activity, ChevronDown, Sparkles } from "lucide-react";
import { useSeasonStatus } from "@/hooks/useSeasonStatus";
import { readHpiLifestyle } from "@/lib/hpi/lifestyleStore";
import { computeHpiSignal } from "@/lib/hpi/hpiSignal";
import { pickTodaysTip } from "@/lib/hpi/seasonalTips";
import { BreathPrimer } from "./BreathPrimer";

/**
 * Human Performance Intelligence card — Neijing-inspired overlay surfaced
 * on the Command Center + Dashboard. Interpretive-only; every value is
 * derived from either the season phase (canonical) or the user's own
 * lifestyle intake (self-reported). Never authors organism truth.
 */
export function HumanPerformanceCard() {
  const { resolvedPhase, phaseProfile, isLoading } = useSeasonStatus();
  const [lifestyleVersion, setLifestyleVersion] = useState(0);
  const lifestyle = useMemo(() => readHpiLifestyle(), [lifestyleVersion]);
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

        <BreathPrimer primer={signal.breathPrimer} />

        <div className="rounded-md border border-border bg-muted/20 p-3">
          <div className="flex items-center gap-2 text-xs font-medium">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Today's wisdom · {tip.category}
          </div>
          <div className="mt-1 text-sm font-medium text-foreground">{tip.title}</div>
          <p className="mt-0.5 text-xs text-muted-foreground">{tip.body}</p>
        </div>

        <Collapsible>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 w-full justify-between px-2 text-xs">
              What drives this score?
              <ChevronDown className="h-3.5 w-3.5" />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2 space-y-1">
            {signal.drivers.map((d, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded border border-border/60 bg-background/60 px-2 py-1 text-xs"
              >
                <span className="text-muted-foreground">{d.label}</span>
                <span
                  className={`font-mono ${
                    d.delta > 0
                      ? "text-emerald-500"
                      : d.delta < 0
                        ? "text-rose-500"
                        : "text-muted-foreground"
                  }`}
                >
                  {d.delta > 0 ? "+" : ""}
                  {d.delta}
                </span>
              </div>
            ))}
            <div className="pt-1 text-[10px] text-muted-foreground">
              Interpretive overlay only — never overrides your organism truth.
            </div>
          </CollapsibleContent>
        </Collapsible>

        {!lifestyle && (
          <div className="rounded-md border border-primary/30 bg-primary/5 p-2 text-xs">
            <div className="font-medium">Personalize this signal</div>
            <p className="mt-0.5 text-muted-foreground">
              Add a 30-second lifestyle intake so HPI can weight sleep,
              hydration, and stress properly.
            </p>
            <Button asChild size="sm" variant="outline" className="mt-2 h-7 text-xs">
              <Link to="/onboarding/athlete?edit=constitution" onClick={() => setLifestyleVersion((v) => v + 1)}>
                Add lifestyle intake
              </Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
