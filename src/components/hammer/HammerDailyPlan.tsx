/**
 * HammerDailyPlan — renders the 9-modality plan produced by
 * `buildHammerDailyPlan`. Sprint: Coach Hammer Authority Consolidation (D).
 *
 * Command Center Authority Restoration §A/§C additions:
 *   - Each block carries a stable anchor id (`hammer-plan-{modality}`) so
 *     observation cards can deep-link athletes into the matching action.
 *   - A schedule-context line surfaces upcoming competition density from
 *     `useScheduleWindow` (RFL-064 first additive integration). The window
 *     is interpretive context only — it never authors organism truth and is
 *     suppressed when missing.
 */
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CalendarClock } from "lucide-react";
import { useHammerAthleteContext } from "@/lib/hammer/context/athleteContext";
import { buildHammerDailyPlan, type BlockStatus } from "@/lib/hammer/prescription/dailyPlan";
import { getHammerIdentity } from "@/lib/hammer/identity";
import { useScheduleWindow } from "@/hooks/command/useScheduleWindow";

const STATUS_TONE: Record<BlockStatus, string> = {
  ready: "border-primary/20",
  "awaiting-input": "border-amber-500/30 bg-amber-500/5",
  suppressed: "border-muted/30 opacity-60",
};

function scheduleLine(sched: ReturnType<typeof useScheduleWindow>): string | null {
  if (sched.unknown || sched.loading) return null;
  if (sched.empty) return null;
  const comp = sched.upcomingCompetition;
  if (comp) {
    if (comp.daysUntil === 0) return `Game today (${comp.label}) — prioritising freshness.`;
    if (comp.daysUntil === 1) return `Game tomorrow (${comp.label}) — short, sharp work today.`;
    if (comp.daysUntil <= 2) return `Competition in ${comp.daysUntil}d — tapering load.`;
    return `Next competition in ${comp.daysUntil}d (${comp.label}).`;
  }
  if (sched.totalPractices > 0) {
    return `${sched.totalPractices} practice${sched.totalPractices === 1 ? "" : "s"} this week.`;
  }
  return null;
}

export function HammerDailyPlan() {
  const ctx = useHammerAthleteContext();
  const navigate = useNavigate();
  const identity = getHammerIdentity();
  const plan = useMemo(() => buildHammerDailyPlan(ctx), [ctx]);
  const sched = useScheduleWindow();
  const schedMsg = scheduleLine(sched);

  return (
    <Card id="hammer-plan" className="scroll-mt-24">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between">
          <span>{identity.voiceLabel} · today's plan</span>
          {plan.missingnessCount > 0 && (
            <Badge variant="outline" className="text-[10px]">
              {plan.missingnessCount} needs input
            </Badge>
          )}
        </CardTitle>
        {schedMsg && (
          <div className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <CalendarClock className="h-3 w-3" />
            <span>{schedMsg}</span>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-2">
        {plan.blocks.map((b) => (
          <div
            key={b.modality}
            id={`hammer-plan-${b.modality}`}
            className={`rounded-lg border p-3 scroll-mt-24 ${STATUS_TONE[b.status]}`}
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
