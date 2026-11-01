/**
 * DailyIntentHeader — mentor-voice narrative + streak arc + earned milestones.
 *
 * Presentation-only. Reads engagement state from localStorage via
 * `dailyEngagement`, derives the daily intent, and renders three lines
 * (yesterday → today → tomorrow) plus a weekly rhythm strip and
 * earned-unlock chips.
 *
 * Constitutional subordination: Eternal Laws · Megaphase 151–160 · RR-5.
 */
import { useMemo, useState } from "react";
import { Sparkles, Flame, Trophy, ChevronDown } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useOpenedOnceToday } from "@/hooks/useOpenedOnceToday";
import {
  buildDailyIntent,
  computeMilestones,
  computeStreak,
  detectMonotony,
  loadEngagement,
  type EngagementState,
} from "@/lib/hammer/prescription/dailyEngagement";
import type { HammerDailyPlanResult } from "@/lib/hammer/prescription/dailyPlan";
import { getSeasonHPI, seasonPhaseFromShort } from "@/lib/seasonPhase";

interface Props {
  readonly plan: HammerDailyPlanResult;
  readonly cnsHigh: boolean;
  /** Reactive tick — bump when completions change so header re-derives. */
  readonly tick: number;
}

export function DailyIntentHeader({ plan, cnsHigh, tick }: Props) {
  const { user } = useAuth();

  const state: EngagementState = useMemo(
    () => loadEngagement(user?.id),
    // tick invalidates memo when a block is marked done/skipped
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user?.id, tick],
  );
  const streak = useMemo(() => computeStreak(state), [state]);
  const milestones = useMemo(() => computeMilestones(streak), [streak]);
  const intent = useMemo(
    () => buildDailyIntent(plan, state, streak, cnsHigh),
    [plan, state, streak, cnsHigh],
  );
  const rotation = useMemo(() => detectMonotony(state, plan.blocks), [state, plan.blocks]);
  const earned = milestones.filter((m) => m.earned);


  const [open, setOpen] = useState<boolean>(false);
  const { shouldGlow, markOpened } = useOpenedOnceToday("start-line");
  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) markOpened();
  };

  return (
    <div
      className={`rounded-lg border border-primary/20 bg-gradient-to-br from-primary/5 via-transparent to-transparent p-3 space-y-2.5 transition-shadow ${
        shouldGlow ? "ring-2 ring-primary/50 animate-hammer-today-glow" : ""
      }`}
    >
      <Collapsible open={open} onOpenChange={handleOpenChange}>
        <div className="flex items-start justify-between gap-3">
          <CollapsibleTrigger className="flex items-start gap-2 text-left min-w-0 flex-1 hover:opacity-90 transition-opacity">
            <Sparkles className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
            <div className="min-w-0 flex-1">
              <div className="text-[10px] uppercase tracking-wider font-semibold text-primary/80 leading-none mb-0.5">
                 Today's aim{shouldGlow ? " · New today" : ""}
              </div>
              <div className="flex items-start justify-between gap-2">
                <div className="text-sm font-semibold leading-tight">{intent.headline}</div>
                <ChevronDown
                  className={`h-4 w-4 mt-0.5 shrink-0 text-muted-foreground transition-transform ${
                    open ? "rotate-180" : ""
                  }`}
                />
              </div>
            </div>
          </CollapsibleTrigger>

          {streak.currentDays > 0 && (
            <div className="flex items-center gap-1 shrink-0 rounded-full bg-amber-500/10 px-2 py-1 border border-amber-500/30">
              <Flame className="h-3.5 w-3.5 text-amber-500" />
              <span className="text-xs font-semibold text-amber-700 dark:text-amber-300">
                {streak.currentDays}d
              </span>
            </div>
          )}
        </div>

        <CollapsibleContent className="space-y-2.5 pt-2">
          {(() => {
            const phaseShort = (plan as unknown as { seasonPhase?: string | null }).seasonPhase ?? null;
            const hpi = getSeasonHPI(phaseShort);
            const phaseLabel = seasonPhaseFromShort(phaseShort).replace('_', '-');
            return (
              <div className="pl-6 rounded-md border border-primary/15 bg-primary/5 p-2">
                <div className="text-[10px] uppercase tracking-wider font-semibold text-primary/80">
                   Today's training focus · {phaseLabel} · {hpi.element}
                </div>
                <div className="text-[11px] text-foreground/85 mt-0.5 leading-snug">
                  {hpi.qiDirective}
                </div>
              </div>
            );
          })()}
          <div className="pl-6">
            <div className="text-[11px] text-muted-foreground leading-relaxed">
              <span className="text-foreground/80">Yesterday:</span> {intent.yesterday}
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
              <span className="text-foreground/80">Today:</span> {intent.today}
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
              <span className="text-foreground/80">Tomorrow:</span> {intent.tomorrow}
            </div>
          </div>

        </CollapsibleContent>
      </Collapsible>




      {/* Earned unlocks */}
      {earned.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <Trophy className="h-3 w-3 text-amber-500 shrink-0" />
          {earned.map((m) => (
            <Badge
              key={m.id}
              variant="outline"
              className="text-[10px] border-amber-500/40 text-amber-700 dark:text-amber-300"
              title={m.hint}
            >
              {m.label}
            </Badge>
          ))}
        </div>
      )}

      {/* Variety / rotation notes */}
      {rotation.length > 0 && (
        <div className="rounded-md border border-cyan-500/30 bg-cyan-500/5 p-2 space-y-1">
          <div className="text-[10px] uppercase tracking-wider font-semibold text-cyan-700 dark:text-cyan-300">
            Fresh angle
          </div>
          {rotation.map((r) => (
            <div key={r.modality} className="text-[11px] text-muted-foreground leading-snug">
              {r.copy}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
