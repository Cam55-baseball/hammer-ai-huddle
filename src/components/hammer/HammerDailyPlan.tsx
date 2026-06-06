/**
 * HammerDailyPlan — renders the 9-modality plan produced by
 * `buildHammerDailyPlan`. Sprint: Coach Hammer Authority Consolidation (D).
 *
 * Every block is actionable (CTA navigates to a real route). Missing-input
 * blocks display the gap rather than fabricating content.
 */
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useHammerAthleteContext } from "@/lib/hammer/context/athleteContext";
import { buildHammerDailyPlan, type BlockStatus } from "@/lib/hammer/prescription/dailyPlan";
import { getHammerIdentity } from "@/lib/hammer/identity";

const STATUS_TONE: Record<BlockStatus, string> = {
  ready: "border-primary/20",
  "awaiting-input": "border-amber-500/30 bg-amber-500/5",
  suppressed: "border-muted/30 opacity-60",
};

export function HammerDailyPlan() {
  const ctx = useHammerAthleteContext();
  const navigate = useNavigate();
  const identity = getHammerIdentity();
  const plan = useMemo(() => buildHammerDailyPlan(ctx), [ctx]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between">
          <span>{identity.voiceLabel} · today's plan</span>
          {plan.missingnessCount > 0 && (
            <Badge variant="outline" className="text-[10px]">
              {plan.missingnessCount} needs input
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {plan.blocks.map((b) => (
          <div
            key={b.modality}
            className={`rounded-lg border p-3 ${STATUS_TONE[b.status]}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold capitalize">{b.title}</span>
                  {b.durationMin !== null && b.durationMin > 0 && (
                    <Badge variant="secondary" className="text-[10px]">
                      {b.durationMin} min
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{b.why}</p>
                {b.steps.length > 0 && (
                  <ul className="mt-2 text-xs space-y-0.5 list-disc list-inside marker:text-muted-foreground">
                    {b.steps.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                )}
              </div>
              <Button
                size="sm"
                variant={b.status === "awaiting-input" ? "outline" : "default"}
                onClick={() => navigate(b.route)}
                className="shrink-0 text-xs"
              >
                {b.ctaLabel}
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
