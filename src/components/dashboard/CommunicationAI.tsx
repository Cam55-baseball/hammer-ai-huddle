/**
 * Communication AI — replaces "Quick Actions" and the prior YourNextStep card.
 *
 * One calm, plain-English instruction with: WHAT to do, WHY it matters, and a
 * single primary CTA. Reads canonical ASB projections only; never authors
 * organism truth. Tone aligned with Today's Standard.
 */
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useAthleteCommandRows } from "@/hooks/command/useAthleteCommandRows";
import { useEscalationFeed } from "@/hooks/command/useEscalationFeed";
import { useDayState } from "@/hooks/useDayState";
import {
  latestByTopicPrefix,
  projectLatest,
  isStale,
} from "@/lib/command/projections";
import { deriveTodaysStandard } from "@/lib/standard/todaysStandard";
import type { AsbEventRow } from "@/hooks/useAsbTimeline";
import { cn } from "@/lib/utils";

type Tier =
  | "survivability"
  | "recovery"
  | "readiness-low"
  | "consistency"
  | "performance"
  | "optimization"
  | "missing";

interface NextStep {
  tier: Tier;
  tierLabel: string;
  title: string;
  instruction: string;
  why: string;
  ctaLabel: string;
  ctaRoute: string;
  staleNote?: string;
}

function scoreOf(ev: AsbEventRow | null): number | null {
  if (!ev) return null;
  const p = projectLatest<Record<string, unknown>>(ev);
  const v = p.value as any;
  const s = v?.score ?? v?.value ?? null;
  return typeof s === "number" ? s : null;
}

function timeOfDayStep(hour: number): NextStep {
  if (hour < 10) {
    return {
      tier: "optimization",
      tierLabel: "Morning",
      title: "Start the day with intent.",
      instruction: "Open the day with mobility and a calm warm-up before your first session.",
      why: "A focused start raises the quality of everything that follows today.",
      ctaLabel: "Start Prep",
      ctaRoute: "/tex-vision",
    };
  }
  if (hour < 16) {
    return {
      tier: "optimization",
      tierLabel: "Train",
      title: "Move into today's session.",
      instruction: "Hit your main training window and focus on quality reps.",
      why: "Mid-day is when your body is primed to absorb good work.",
      ctaLabel: "Open Practice",
      ctaRoute: "/practice",
    };
  }
  if (hour < 21) {
    return {
      tier: "optimization",
      tierLabel: "Lock In",
      title: "Close the loop on today.",
      instruction: "Log today's work so tomorrow's plan reflects what really happened.",
      why: "Tracking what you did keeps your guidance honest and personal.",
      ctaLabel: "Log to Vault",
      ctaRoute: "/vault",
    };
  }
  return {
    tier: "optimization",
    tierLabel: "Recover",
    title: "Wind down — sleep wins.",
    instruction: "Hydrate, finish nutrition, and ease into your wind-down routine.",
    why: "Tonight's recovery is what makes tomorrow's training possible.",
    ctaLabel: "Plan Tomorrow",
    ctaRoute: "/nutrition-hub",
  };
}

export function deriveCommunication(
  rows: AsbEventRow[] | undefined,
  escalationCount: number,
  now: Date = new Date(),
): NextStep {
  if (!rows || rows.length === 0) {
    return {
      tier: "missing",
      tierLabel: "Start Here",
      title: "Log today's check-in.",
      instruction: "Take 30 seconds to tell us how you feel and what's on the schedule.",
      why: "Without a fresh signal, guidance falls back to time-of-day defaults.",
      ctaLabel: "Open Check-In",
      ctaRoute: "/command",
    };
  }

  // 1. Survivability — any active escalation
  if (escalationCount > 0) {
    return {
      tier: "survivability",
      tierLabel: "Check In",
      title: "Pause and check in with your body.",
      instruction: "Open the alert and acknowledge it before training today.",
      why: "Your system flagged a pattern that needs your attention before anything else.",
      ctaLabel: "Review Alert",
      ctaRoute: "/command",
    };
  }

  const readinessEv = latestByTopicPrefix(rows, "behavioral.readiness");
  const fatigueEv = latestByTopicPrefix(rows, "behavioral.fatigue");
  const recoveryEv =
    latestByTopicPrefix(rows, "behavioral.recovery") ??
    latestByTopicPrefix(rows, "foundation.recovery");

  const readiness = scoreOf(readinessEv);
  const fatigue = scoreOf(fatigueEv);
  const recovery = scoreOf(recoveryEv);

  const readinessStale = isStale(readinessEv?.occurred_at ?? null, 36, now);
  const fatigueStale = isStale(fatigueEv?.occurred_at ?? null, 36, now);
  const recoveryStale = isStale(recoveryEv?.occurred_at ?? null, 48, now);

  // 2. Recovery risk
  const recoveryLow = recovery !== null && !recoveryStale && recovery < 0.45;
  const fatigueHigh = fatigue !== null && !fatigueStale && fatigue > 0.7;
  if (recoveryLow || fatigueHigh) {
    return {
      tier: "recovery",
      tierLabel: "Recover",
      title: "Your body needs recovery today.",
      instruction: "Complete a full recovery session before 8 PM.",
      why: fatigueHigh
        ? "Fatigue is elevated — a lighter day now protects tomorrow's work."
        : "Recovery has dropped after recent workload — give it back tonight.",
      ctaLabel: "Start Recovery",
      ctaRoute: "/bounce-back-bay",
    };
  }

  // 3. Readiness low
  if (readiness !== null && !readinessStale && readiness < 0.4) {
    return {
      tier: "readiness-low",
      tierLabel: "Take It Easy",
      title: "Take it easy today.",
      instruction: "Swap intensity for mobility and a short recovery flow.",
      why: "Readiness is below your normal range — pushing now will slip recovery further.",
      ctaLabel: "Open Recovery",
      ctaRoute: "/bounce-back-bay",
    };
  }

  // 4. Performance ready
  const readyHigh = readiness !== null && !readinessStale && readiness >= 0.65;
  const fatigueOk = fatigue === null || fatigueStale || fatigue <= 0.55;
  if (readyHigh && fatigueOk) {
    return {
      tier: "performance",
      tierLabel: "Ready",
      title: "You're ready to push today.",
      instruction: "Move into your main session with full intent.",
      why: "Readiness is strong and fatigue is in check — make this one count.",
      ctaLabel: "Start Training",
      ctaRoute: "/practice",
    };
  }

  // 5. Time-of-day fallback
  const step = timeOfDayStep(now.getHours());
  if (readinessStale && fatigueStale && recoveryStale) {
    step.staleNote = "Based on older signals — log today's check-in for fresh guidance.";
  }
  return step;
}

const TIER_TONE: Record<Tier, string> = {
  survivability: "bg-destructive/15 text-destructive border-destructive/30",
  recovery: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
  "readiness-low": "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
  consistency: "bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30",
  performance: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
  optimization: "bg-primary/10 text-primary border-primary/30",
  missing: "bg-muted text-muted-foreground border-border",
};

interface Props { className?: string }

export function CommunicationAI({ className }: Props) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: rows, isLoading } = useAthleteCommandRows({ days: 30, limit: 500 });
  const { unackedCount } = useEscalationFeed({ withinHours: 72 });
  const { dayType } = useDayState();

  const step = useMemo(
    () => deriveCommunication(rows, unackedCount ?? 0),
    [rows, unackedCount],
  );
  // Pull the standard once so the long-term framing line stays aligned.
  const standard = useMemo(
    () => deriveTodaysStandard(rows, dayType),
    [rows, dayType],
  );

  if (!user || isLoading) {
    return (
      <section
        className={cn(
          "rounded-2xl border border-border bg-card p-6 sm:p-8 animate-pulse",
          className,
        )}
        aria-busy="true"
      >
        <div className="h-3 w-32 rounded bg-muted mb-6" />
        <div className="h-8 w-2/3 rounded bg-muted mb-4" />
        <div className="h-4 w-full rounded bg-muted mb-2" />
        <div className="h-4 w-3/4 rounded bg-muted" />
      </section>
    );
  }

  return (
    <section
      aria-labelledby="communication-ai-heading"
      className={cn(
        "relative overflow-hidden rounded-2xl border border-primary/20 p-4 sm:p-5",
        "bg-gradient-to-br from-primary/10 via-card to-card",
        "shadow-sm",
        className,
      )}
    >
      <div className="relative flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" aria-hidden />
          <h2
            id="communication-ai-heading"
            className="text-[11px] font-black uppercase tracking-[0.22em] text-foreground"
          >
            Your Next Best Step
          </h2>
        </div>
        <span
          className={cn(
            "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
            TIER_TONE[step.tier],
          )}
        >
          {step.tierLabel}
        </span>
      </div>

      <div className="relative space-y-2 max-w-2xl">
        <h3 className="text-lg sm:text-xl font-semibold tracking-tight text-foreground leading-tight">
          {step.title}
        </h3>
        <p className="text-sm font-medium text-foreground flex items-start gap-2">
          <ArrowRight className="h-4 w-4 mt-0.5 shrink-0 text-primary" aria-hidden />
          <span>{step.instruction}</span>
        </p>
        <p className="text-xs text-muted-foreground leading-relaxed">
          <span className="font-semibold text-foreground/80">Why this matters: </span>
          {step.why}
        </p>
      </div>

      <div className="relative mt-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <Button
          onClick={() => navigate(step.ctaRoute)}
          className="w-full sm:w-auto font-semibold"
        >
          {step.ctaLabel}
        </Button>
        {step.staleNote ? (
          <span className="text-xs text-muted-foreground">{step.staleNote}</span>
        ) : (
          <span className="text-xs text-muted-foreground italic">
            Long-term: {standard.motivational}
          </span>
        )}
      </div>
    </section>
  );
}

    </section>
  );
}
