import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import type { HammerDailyPlanResult } from "@/lib/hammer/prescription/dailyPlan";
import { RUNG_ORDER, rungByKey } from "@/lib/hammer/roadmap/roadmapLadder";
import { CheckCircle2, Circle, Target, ChevronRight } from "lucide-react";

interface Props {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly roadmap: HammerDailyPlanResult["roadmap"];
}

/**
 * RoadmapExplainerSheet — one screen that tells the athlete where they
 * are on the long build, what unlocks the next rung, and what elite
 * capacity looks like at the top of the ladder. Read-only, interpretive.
 */
export function RoadmapExplainerSheet({ open, onOpenChange, roadmap }: Props) {
  const { rung, rungRationale, quarter, eliteTarget, throwingLadder } = roadmap;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[92vh] overflow-y-auto">
        <SheetHeader className="text-left">
          <SheetTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Your Roadmap
          </SheetTitle>
          <SheetDescription>
            Every day's plan is a rung on the ladder to {eliteTarget.league} 6-game weeks.
            Where you start is chosen for you by your training age, season, and safety floors —
            the goal is to keep earning the next rung.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          {/* Current rung callout */}
          <section className="rounded-lg border border-primary/30 bg-primary/5 p-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-primary">
              You're on rung {rung.index} of 5
            </div>
            <div className="mt-0.5 text-lg font-bold text-foreground">{rung.label}</div>
            <div className="text-sm text-muted-foreground">{rung.headline}</div>
            <p className="mt-2 text-sm text-foreground/90">{rung.description}</p>
            <div className="mt-2 rounded-md bg-background/60 border border-muted/40 px-2 py-1.5 text-[11px] text-muted-foreground">
              <span className="font-medium text-foreground">Why this rung: </span>
              {rungRationale}
            </div>
          </section>

          {/* Season quarter */}
          <section className="rounded-lg border border-muted/40 bg-background p-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              This mesocycle
            </div>
            <div className="mt-0.5 text-base font-bold text-foreground">{quarter.label}</div>
            <div className="text-sm text-muted-foreground">{quarter.headline}</div>
            <p className="mt-1 text-sm text-foreground/90">{quarter.description}</p>
            <div className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
              <div className="rounded-md bg-muted/10 px-2 py-1">
                <div className="text-muted-foreground">Recovery clock</div>
                <div className="font-semibold text-foreground">
                  ×{quarter.recoveryWindowMultiplier.toFixed(2)}
                </div>
              </div>
              <div className="rounded-md bg-muted/10 px-2 py-1">
                <div className="text-muted-foreground">Volume ceiling</div>
                <div className="font-semibold text-foreground">
                  ×{quarter.volumeCeilingMultiplier.toFixed(2)}
                </div>
              </div>
            </div>
          </section>

          {/* Throwing ladder */}
          {throwingLadder && (
            <section className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">
                Throwing ladder — today
              </div>
              <div className="mt-0.5 text-base font-bold text-foreground">
                {throwingLadder.throwsToday} throws · {throwingLadder.maxIntentPercent}% intent
              </div>
              <div className="text-sm text-muted-foreground">
                {throwingLadder.longTossUnlocked
                  ? "Long-toss is unlocked."
                  : "Long-toss is still locked."}
              </div>
              <p className="mt-1 text-sm text-foreground/90">{throwingLadder.rationale}</p>
            </section>
          )}

          {/* Ladder overview */}
          <section className="rounded-lg border border-muted/40 bg-background p-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              The full ladder
            </div>
            <ol className="mt-2 space-y-2">
              {RUNG_ORDER.map((k) => {
                const d = rungByKey(k);
                const isCurrent = d.rung === rung.rung;
                const isDone = d.index < rung.index;
                return (
                  <li
                    key={d.rung}
                    className={[
                      "flex items-start gap-2 rounded-md px-2 py-1.5",
                      isCurrent ? "bg-primary/10 border border-primary/30" : "border border-transparent",
                    ].join(" ")}
                  >
                    {isDone ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                    ) : isCurrent ? (
                      <ChevronRight className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    ) : (
                      <Circle className="h-4 w-4 text-muted-foreground/50 mt-0.5 shrink-0" />
                    )}
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-foreground">
                        {d.index}. {d.label}
                      </div>
                      <div className="text-[11px] text-muted-foreground">{d.headline}</div>
                      {isCurrent && rung.nextRung && (
                        <div className="mt-1 text-[11px] text-primary">
                          <span className="font-medium">To reach {rungByKey(rung.nextRung).label}:</span>
                          <ul className="mt-0.5 list-disc pl-4 text-foreground/80">
                            {rung.promotionCriteria.map((c) => (
                              <li key={c}>{c}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>

          {/* Elite target */}
          <section className="rounded-lg border border-primary/25 bg-gradient-to-b from-primary/10 to-transparent p-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-primary">
              The endpoint — {eliteTarget.league}
            </div>
            <div className="mt-0.5 text-base font-bold text-foreground">
              {eliteTarget.gamesPerWeekHigh} high-level games / week
            </div>
            <p className="mt-1 text-sm text-foreground/90">{eliteTarget.notes}</p>
            <div className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
              <StatChip label="Lifts / wk" value={String(eliteTarget.liftSessionsPerWeek)} />
              <StatChip label="Speed / wk" value={String(eliteTarget.speedSessionsPerWeek)} />
              <StatChip label="Bat speed / wk" value={String(eliteTarget.batSpeedSessionsPerWeek)} />
              <StatChip label="Throws / wk cap" value={String(eliteTarget.weeklyThrowsCeiling)} />
            </div>
          </section>

          <p className="text-[11px] text-muted-foreground">
            Safety-first floors (injury, parent supremacy, readiness deload) always outrank
            the roadmap. The ladder can only trim or delay — it never overrides your body.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-muted/40 bg-background/60 px-2 py-1">
      <div className="text-muted-foreground">{label}</div>
      <div className="font-semibold text-foreground">{value}</div>
    </div>
  );
}
