import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useAthleteCommandRows } from "@/hooks/command/useAthleteCommandRows";
import { useEscalationFeed } from "@/hooks/command/useEscalationFeed";
import {
  latestByTopicPrefix,
  projectLatest,
  isStale,
} from "@/lib/command/projections";
import type { AsbEventRow } from "@/hooks/useAsbTimeline";
import { cn } from "@/lib/utils";

type Tier =
  | "survivability"
  | "recovery"
  | "readiness-low"
  | "performance"
  | "optimization"
  | "missing";

interface NextStep {
  tier: Tier;
  tierLabel: string;
  headline: string;
  why: string;
  action: string;
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
      tierLabel: "Prep",
      headline: "Begin your morning prep routine.",
      why: "A calm, intentional start sets the tone for everything that follows today.",
      action: "Start with mobility and nervous-system priming before your first session.",
      ctaLabel: "Start Prep",
      ctaRoute: "/tex-vision",
    };
  }
  if (hour < 16) {
    return {
      tier: "optimization",
      tierLabel: "Train",
      headline: "Hit your training window.",
      why: "Your body is primed for output in the middle of the day — use the window well.",
      action: "Move into today's main session and stay focused on quality reps.",
      ctaLabel: "Open Practice",
      ctaRoute: "/practice",
    };
  }
  if (hour < 21) {
    return {
      tier: "optimization",
      tierLabel: "Lock In",
      headline: "Lock in today's session.",
      why: "Capturing what you did closes the loop and feeds tomorrow's plan.",
      action: "Log today's work so the system can guide what comes next.",
      ctaLabel: "Log to Vault",
      ctaRoute: "/vault",
    };
  }
  return {
    tier: "optimization",
    tierLabel: "Recover",
    headline: "Wind down — quality sleep wins.",
    why: "Tonight's recovery is what makes tomorrow's training possible.",
    action: "Hydrate, finish nutrition, and start your wind-down routine.",
    ctaLabel: "Plan Tomorrow",
    ctaRoute: "/nutrition-hub",
  };
}

export function deriveNextStep(
  rows: AsbEventRow[] | undefined,
  escalationCount: number,
  now: Date = new Date(),
): NextStep {
  if (!rows || rows.length === 0) {
    return {
      tier: "missing",
      tierLabel: "Start Here",
      headline: "Log today's check-in to unlock your next step.",
      why: "Your coach needs a baseline read on how you feel right now.",
      action: "Take 30 seconds to log readiness and today's plan.",
      ctaLabel: "Open Check-In",
      ctaRoute: "/command",
    };
  }

  // 1. Survivability — any active escalation
  if (escalationCount > 0) {
    return {
      tier: "survivability",
      tierLabel: "Survivability",
      headline: "Pause and check in with your body.",
      why: "Your system flagged a pattern that needs your attention before anything else today.",
      action: "Review the alert and acknowledge it before training.",
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

  // 2. Recovery
  const recoveryLow = recovery !== null && !recoveryStale && recovery < 0.45;
  const fatigueHigh = fatigue !== null && !fatigueStale && fatigue > 0.7;
  if (recoveryLow || fatigueHigh) {
    return {
      tier: "recovery",
      tierLabel: "Recovery",
      headline: "Your body needs recovery today.",
      why: fatigueHigh
        ? "Fatigue is elevated and your system is asking for a lighter day."
        : "Recovery has dropped after recent workload — protect tomorrow by recovering tonight.",
      action: "Complete a full recovery session before 8 PM.",
      ctaLabel: "Start Recovery",
      ctaRoute: "/bounce-back-bay",
    };
  }

  // 3. Low readiness
  if (readiness !== null && !readinessStale && readiness < 0.4) {
    return {
      tier: "readiness-low",
      tierLabel: "Take It Easy",
      headline: "Take it easy today.",
      why: "Readiness is below your normal range — push too hard and recovery will slip further.",
      action: "Swap intensity for mobility and a short recovery flow.",
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
      headline: "You are ready to push today.",
      why: "Readiness is strong and fatigue is in check — make this session count.",
      action: "Move into today's main work with full intent.",
      ctaLabel: "Start Training",
      ctaRoute: "/practice",
    };
  }

  // 5. Fallback to time-of-day optimization
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
  performance: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
  optimization: "bg-primary/10 text-primary border-primary/30",
  missing: "bg-muted text-muted-foreground border-border",
};

interface Props {
  className?: string;
}

export function YourNextStep({ className }: Props) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: rows, isLoading } = useAthleteCommandRows({ days: 30, limit: 500 });
  const { unackedCount } = useEscalationFeed({ withinHours: 72 });

  const step = useMemo(
    () => deriveNextStep(rows, unackedCount ?? 0),
    [rows, unackedCount],
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
      aria-labelledby="your-next-step-heading"
      className={cn(
        "relative overflow-hidden rounded-2xl border border-primary/20 p-6 sm:p-8",
        "bg-gradient-to-br from-primary/10 via-card to-card",
        "shadow-[0_8px_30px_-12px_hsl(var(--primary)/0.35)]",
        className,
      )}
    >
      <div className="pointer-events-none absolute -top-16 -right-16 h-40 w-40 rounded-full bg-primary/15 blur-3xl" />

      <div className="relative flex items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" aria-hidden />
          <h2
            id="your-next-step-heading"
            className="text-[11px] font-black uppercase tracking-[0.22em] text-foreground"
          >
            Your Next Step
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

      <div className="relative space-y-4 max-w-2xl">
        <h3 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground leading-tight">
          {step.headline}
        </h3>
        <p className="text-base text-muted-foreground leading-relaxed">{step.why}</p>
        <p className="text-sm font-medium text-foreground flex items-start gap-2">
          <ArrowRight className="h-4 w-4 mt-0.5 shrink-0 text-primary" aria-hidden />
          <span>{step.action}</span>
        </p>
      </div>

      <div className="relative mt-6 flex flex-col sm:flex-row sm:items-center gap-3">
        <Button
          size="lg"
          onClick={() => navigate(step.ctaRoute)}
          className="w-full sm:w-auto font-semibold"
        >
          {step.ctaLabel}
        </Button>
        {step.staleNote && (
          <span className="text-xs text-muted-foreground">{step.staleNote}</span>
        )}
      </div>
    </section>
  );
}
